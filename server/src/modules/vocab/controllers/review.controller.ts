// src/modules/vocab/controllers/review.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ReviewService } from '../services/review.service'; // Sửa tên class
import { ManagementService } from '../services/management.service'; // Thêm để dùng findPublicDecks
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AnswerCardDto } from '../dto/vocab.dto'; // Xóa EnrollDeckDto

@Controller('vocab')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly managementService: ManagementService, // Inject thêm
  ) {}

  @Get('decks/public')
  async getPublicDecks(
    @Query('search') search: string,
    @Query('tag') tag: string,
  ) {
    // Hàm này nằm ở ManagementService
    return this.managementService.findPublicDecks(search, tag);
  }

  @Post('decks/:id/enroll')
  async enrollDeck(
    @Param('id') deckId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.enrollDeck(userId, deckId);
  }

  @Get('reviews/today')
  async getTodayCards(@CurrentUser('id') userId: string) {
    return this.reviewService.getTodayReviews(userId);
  }

  @Patch('reviews/:cardId/answer')
  async answerCard(
    @Param('cardId') cardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AnswerCardDto,
  ) {
    return this.reviewService.processAnswer(userId, cardId, dto.grade);
  }

  @Get('reviews/stats')
  async getReviewStats(@CurrentUser('id') userId: string) {
    return this.reviewService.getReviewStats(userId);
  }

  @Get('decks/enrolled')
  async getMyEnrolledDecks(@CurrentUser('id') userId: string) {
    // Lấy các bộ thẻ User đang theo học
    return this.reviewService.getEnrolledDecks(userId);
  }

  // --- BULK SYNC (Cho Next.js) ---

  @Post('reviews/sync')
  async syncReviewResults(
    @CurrentUser('id') userId: string,
    @Body() results: { cardId: string; grade: number }[],
  ) {
    /**
     * Thay vì gọi Patch lẻ tẻ 20 lần cho 20 cards,
     * Next.js gửi 1 mảng kết quả lên đây để Server xử lý 1 lần.
     */
    return this.reviewService.bulkProcessAnswers(userId, results);
  }

  // --- PROGRESS ---

  @Delete('decks/:id/unenroll')
  async unenrollDeck(
    @Param('id') deckId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Ngừng học bộ thẻ này (Xóa các card liên quan của User)
    return this.reviewService.unenrollDeck(userId, deckId);
  }
}

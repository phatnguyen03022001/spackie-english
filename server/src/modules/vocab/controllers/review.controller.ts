// src/modules/vocab/controllers/review.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { ReviewService } from '../services/review.service';
import { ManagementService } from '../services/management.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SyncSessionDto, CreateSessionDto } from '../dto/vocab.dto';

@Controller('vocab')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly managementService: ManagementService,
  ) {}

  @Get('decks/public')
  async getPublicDecks(
    @Query('search') search: string,
    @Query('tag') tag: string,
  ) {
    return this.managementService.findPublicDecks(search, tag);
  }

  @Get('decks/:id/preview')
  async getDeckPreview(@Param('id') deckId: string) {
    return this.managementService.getDeckWithCards(deckId);
  }

  @Post('decks/:id/enroll')
  async enrollDeck(
    @Param('id') deckId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.enrollDeck(userId, deckId);
  }

  @Delete('decks/:id/unenroll')
  async unenrollDeck(
    @Param('id') deckId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.unenrollDeck(userId, deckId);
  }

  @Get('decks/enrolled')
  async getMyEnrolledDecks(@CurrentUser('id') userId: string) {
    return this.reviewService.getEnrolledDecks(userId);
  }

  @Post('reviews/session/start')
  async startSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    // API này trả về: sessionId + mảng Cards[] (bao gồm info SM-2 hiện tại)
    return this.reviewService.createLearningSession(userId, dto.deckId);
  }

  @Post('reviews/session/sync')
  async syncSessionResults(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncSessionDto,
  ) {
    // Nhận mảng kết quả SM-2 đã tính từ Client, cập nhật Card & UserStats
    return this.reviewService.syncSessionProgress(userId, dto);
  }

  @Patch('reviews/session/:id/cancel')
  async cancelSession(
    @Param('id') sessionId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Đóng session mà không lưu kết quả nếu người dùng hủy giữa chừng
    return this.reviewService.cancelSession(userId, sessionId);
  }

  @Get('dashboard/stats')
  async getQuantitativeStats(@CurrentUser('id') userId: string) {
    // Lấy dữ liệu từ bảng UserStats: totalWords, learnedWords, masteredWords, totalReviews
    return this.reviewService.getUserStats(userId);
  }

  @Get('reviews/forecast')
  async getReviewForecast(@CurrentUser('id') userId: string) {
    // Dự báo số lượng thẻ sẽ đến hạn trong tương lai
    return this.reviewService.getReviewForecast(userId);
  }

  @Get('dashboard/heatmap')
  async getLearningHeatmap(@CurrentUser('id') userId: string) {
    // Thống kê dựa trên LearningSession để vẽ biểu đồ tần suất học
    return this.reviewService.getHeatmap(userId);
  }
}

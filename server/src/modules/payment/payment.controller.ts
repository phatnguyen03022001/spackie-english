// src/modules/payment/payment.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService } from '@modules/payment/payment.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '@common/interceptors/idempotency.interceptor';
import {
  SubscriptionInfoDto,
  CreatePaymentResponseDto,
  AdminSubscriptionListDto,
} from '@modules/payment/dto/subscription-info.dto';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Create a payment order' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique idempotency key to prevent duplicate payments',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created',
    type: CreatePaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'INVALID_PLAN or INVALID_AMOUNT' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPayment(
    @CurrentUser('id') userId: string,
    @Body('plan') plan: string,
    @Body('amount') amount: number,
    @Headers('Idempotency-Key') _idempotencyKey?: string,
  ): Promise<CreatePaymentResponseDto> {
    return this.paymentService.createPayment(userId, plan, amount);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    example: 1,
    minimum: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @ApiResponse({ status: 200, description: 'Paginated payment history' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page: string | number = 1,
    @Query('limit') limit: string | number = 10,
  ) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    return this.paymentService.getPaymentHistory(userId, pageNum, limitNum);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current subscription info' })
  @ApiResponse({
    status: 200,
    description: 'Subscription info',
    type: SubscriptionInfoDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscription(
    @CurrentUser('id') userId: string,
  ): Promise<SubscriptionInfoDto> {
    return this.paymentService.getSubscription(userId);
  }

  @Post('subscription/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel auto-renewal' })
  @ApiResponse({ status: 200, description: 'Auto-renewal cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'SUBSCRIPTION_NOT_FOUND' })
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.paymentService.cancelSubscription(userId);
  }
}

@ApiTags('Admin Payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions (admin)' })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    example: 1,
    minimum: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated subscriptions list',
    type: AdminSubscriptionListDto,
  })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  async getAllSubscriptions(
    @Query('page') page: string | number = 1,
    @Query('limit') limit: string | number = 10,
  ) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    return this.paymentService.getAllSubscriptions(pageNum, limitNum);
  }

  @Post('subscriptions/grant')
  @ApiOperation({ summary: 'Grant VIP subscription manually' })
  @ApiResponse({ status: 201, description: 'VIP subscription granted' })
  @ApiResponse({ status: 400, description: 'INVALID_USER_ID or INVALID_PLAN' })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  async grantVip(
    @Body('userId') userId: string,
    @Body('plan') plan: string,
    @Body('durationDays') durationDays: number,
  ) {
    return this.paymentService.grantVipSubscription(userId, plan, durationDays);
  }

  @Post('payment/refund/:paymentId')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID to refund' })
  @ApiResponse({ status: 200, description: 'Payment refunded' })
  @ApiResponse({ status: 403, description: 'AUTH_INSUFFICIENT_PERMISSIONS' })
  @ApiResponse({ status: 404, description: 'PAYMENT_NOT_FOUND' })
  async refundPayment(@Param('paymentId') paymentId: string) {
    return this.paymentService.refundPayment(paymentId);
  }
}

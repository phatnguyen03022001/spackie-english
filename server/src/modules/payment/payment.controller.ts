// src/modules/payment/payment.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from '@modules/payment/payment.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type {
  ISubscriptionInfo,
  ICreatePaymentResponse,
} from '@modules/payment/interfaces/payment.interface';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a payment order' })
  async createPayment(
    @CurrentUser('id') userId: string,
    @Body('plan') plan: string,
    @Body('amount') amount: number,
  ): Promise<ICreatePaymentResponse> {
    return this.paymentService.createPayment(userId, plan, amount);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getPaymentHistory(userId, page, limit);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current subscription info' })
  async getSubscription(
    @CurrentUser('id') userId: string,
  ): Promise<ISubscriptionInfo> {
    return this.paymentService.getSubscription(userId);
  }

  @Post('subscription/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel auto-renewal' })
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
  async getAllSubscriptions(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getAllSubscriptions(page, limit);
  }

  @Post('subscriptions/grant')
  @ApiOperation({ summary: 'Grant VIP subscription manually' })
  async grantVip(
    @Body('userId') userId: string,
    @Body('plan') plan: string,
    @Body('durationDays') durationDays: number,
  ) {
    return this.paymentService.grantVipSubscription(userId, plan, durationDays);
  }

  @Post('payment/refund/:paymentId')
  @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(@Param('paymentId') paymentId: string) {
    return this.paymentService.refundPayment(paymentId);
  }
}

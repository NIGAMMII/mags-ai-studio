import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import Stripe from 'stripe';
import { Payment, PaymentStatus } from '../entities/billing.entity';
import { PaymentIntentDto } from '../dto/payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    }
  }

  async createPayment(userId: string, dto: PaymentIntentDto): Promise<any> {
    this.logger.log(`Creating payment for user: ${userId}`);

    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: dto.amount,
        currency: dto.currency.toLowerCase(),
        description: dto.description,
        metadata: {
          userId,
          ...dto.metadata,
        },
      });

      // Store payment in database
      return this.prisma.payment.create({
        data: {
          userId,
          amount: dto.amount,
          currency: dto.currency,
          status: PaymentStatus.PENDING,
          stripePaymentIntentId: paymentIntent.id,
          metadata: dto.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw error;
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async handlePaymentSuccess(paymentIntentId: string): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntentId}`);

    // Update payment status
    await this.prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: PaymentStatus.SUCCESS },
    });
  }

  async handlePaymentFailure(paymentIntentId: string, reason: string): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntentId}`);

    await this.prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: reason,
      },
    });
  }

  async refundPayment(paymentId: string, reason?: string): Promise<any> {
    this.logger.log(`Refunding payment: ${paymentId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new BadRequestException(`Payment not found: ${paymentId}`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    if (!this.stripe || !payment.stripeChargeId) {
      throw new Error('Refund not available');
    }

    try {
      await this.stripe.refunds.create({
        charge: payment.stripeChargeId,
        reason: reason,
      });

      return this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.REFUNDED },
      });
    } catch (error) {
      this.logger.error(`Refund failed: ${error.message}`);
      throw error;
    }
  }

  async getPaymentHistory(userId: string, limit: number = 50): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { BillingPeriod, PlanType } from '../entities/billing.entity';

export class CreateCheckoutSessionDto {
  @IsEnum(PlanType)
  planType: PlanType;

  @IsEnum(BillingPeriod)
  billingPeriod: BillingPeriod;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;
}

export class PaymentIntentDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentResponseDto {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  stripePaymentIntentId?: string;
  failureReason?: string;
  createdAt: Date;
}

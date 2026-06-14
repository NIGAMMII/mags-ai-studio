import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Subscription, SubscriptionStatus, BillingPeriod } from '../entities/billing.entity';
import { CreateSubscriptionDto, UpgradeSubscriptionDto, CancelSubscriptionDto } from '../dto/subscription.dto';
import { PlanService } from './plan.service';
import { PaymentService } from './payment.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private planService: PlanService,
    private paymentService: PaymentService,
    @InjectQueue('billing') private billingQueue: Queue,
  ) {}

  async createSubscription(userId: string, dto: CreateSubscriptionDto): Promise<any> {
    this.logger.log(`Creating subscription for user: ${userId}`);

    // Check if user already has active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    // Get plan
    const plan = await this.planService.getPlanByType(dto.planType);

    // Calculate pricing
    const price = dto.billingPeriod === BillingPeriod.MONTHLY ? plan.monthlyPrice : plan.yearlyPrice;
    const periodLength = dto.billingPeriod === BillingPeriod.MONTHLY ? 30 : 365;

    // Create subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        billingPeriod: dto.billingPeriod,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + periodLength * 24 * 60 * 60 * 1000),
      },
      include: { plan: true, user: true },
    });

    // Create payment
    await this.paymentService.createPayment(userId, {
      amount: price,
      currency: 'USD',
      description: `Subscription: ${plan.name}`,
      metadata: { subscriptionId: subscription.id, planId: plan.id },
    });

    // Queue billing event
    await this.billingQueue.add(
      'subscription-created',
      { subscriptionId: subscription.id, userId },
      { removeOnComplete: true },
    );

    return subscription;
  }

  async getSubscription(userId: string): Promise<any> {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });
  }

  async upgradeSubscription(userId: string, dto: UpgradeSubscriptionDto): Promise<any> {
    this.logger.log(`Upgrading subscription for user: ${userId}`);

    const currentSubscription = await this.getSubscription(userId);

    if (!currentSubscription) {
      throw new NotFoundException('Active subscription not found');
    }

    // Get new plan
    const newPlan = await this.planService.getPlanByType(dto.newPlanType);
    const currentPlan = currentSubscription.plan;

    if (newPlan.monthlyPrice <= currentPlan.monthlyPrice) {
      throw new BadRequestException('Can only upgrade to a higher tier');
    }

    // Calculate proration
    const prorationAmount = this.calculateProration(
      currentSubscription,
      currentPlan,
      newPlan,
      dto.newBillingPeriod || currentSubscription.billingPeriod,
    );

    // Update subscription
    const updated = await this.prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        planId: newPlan.id,
        billingPeriod: dto.newBillingPeriod || currentSubscription.billingPeriod,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          Date.now() + (dto.newBillingPeriod === BillingPeriod.YEARLY ? 365 : 30) * 24 * 60 * 60 * 1000,
        ),
      },
      include: { plan: true },
    });

    // Charge proration
    if (prorationAmount > 0) {
      await this.paymentService.createPayment(userId, {
        amount: Math.ceil(prorationAmount * 100),
        currency: 'USD',
        description: `Upgrade to ${newPlan.name}`,
        metadata: { subscriptionId: currentSubscription.id, upgradeFrom: currentPlan.id },
      });
    }

    // Queue upgrade event
    await this.billingQueue.add(
      'subscription-upgraded',
      { subscriptionId: updated.id, userId, from: currentPlan.type, to: newPlan.type },
      { removeOnComplete: true },
    );

    return updated;
  }

  async downgradeSubscription(userId: string, dto: UpgradeSubscriptionDto): Promise<any> {
    this.logger.log(`Downgrading subscription for user: ${userId}`);

    const currentSubscription = await this.getSubscription(userId);

    if (!currentSubscription) {
      throw new NotFoundException('Active subscription not found');
    }

    const newPlan = await this.planService.getPlanByType(dto.newPlanType);
    const currentPlan = currentSubscription.plan;

    // Update subscription (downgrade takes effect at end of period)
    const updated = await this.prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        planId: newPlan.id,
      },
      include: { plan: true },
    });

    // Queue downgrade event
    await this.billingQueue.add(
      'subscription-downgraded',
      { subscriptionId: updated.id, userId, from: currentPlan.type, to: newPlan.type },
      { removeOnComplete: true },
    );

    return updated;
  }

  async cancelSubscription(userId: string, dto: CancelSubscriptionDto): Promise<any> {
    this.logger.log(`Cancelling subscription for user: ${userId}`);

    const subscription = await this.getSubscription(userId);

    if (!subscription) {
      throw new NotFoundException('Active subscription not found');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });

    // Queue cancellation event
    await this.billingQueue.add(
      'subscription-cancelled',
      { subscriptionId: subscription.id, userId, reason: dto.reason, feedback: dto.feedback },
      { removeOnComplete: true },
    );

    return updated;
  }

  async renewSubscription(subscriptionId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, user: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found: ${subscriptionId}`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Subscription is not active');
    }

    const price =
      subscription.billingPeriod === BillingPeriod.MONTHLY
        ? subscription.plan.monthlyPrice
        : subscription.plan.yearlyPrice;

    // Charge for renewal
    await this.paymentService.createPayment(subscription.userId, {
      amount: price,
      currency: 'USD',
      description: `Renewal: ${subscription.plan.name}`,
      metadata: { subscriptionId: subscription.id },
    });

    // Update period
    const periodLength =
      subscription.billingPeriod === BillingPeriod.MONTHLY ? 30 : 365;

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(
          Date.now() + periodLength * 24 * 60 * 60 * 1000,
        ),
      },
    });
  }

  private calculateProration(
    subscription: any,
    oldPlan: any,
    newPlan: any,
    newBillingPeriod: BillingPeriod,
  ): number {
    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd;
    const daysRemaining =
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const totalDays =
      newBillingPeriod === BillingPeriod.MONTHLY ? 30 : 365;

    const dailyOldRate = oldPlan.monthlyPrice / 30;
    const dailyNewRate = newPlan.monthlyPrice / 30;

    const creditForOldPlan = dailyOldRate * daysRemaining;
    const chargeForNewPlan = dailyNewRate * daysRemaining;

    return chargeForNewPlan - creditForOldPlan;
  }
}

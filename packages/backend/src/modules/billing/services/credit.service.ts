import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CreditWallet, CreditTransaction } from '../entities/billing.entity';
import { AddCreditDto, DeductCreditDto } from '../dto/credit.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('billing') private billingQueue: Queue,
  ) {}

  async initializeWallet(userId: string): Promise<any> {
    this.logger.log(`Initializing credit wallet for user: ${userId}`);

    // Check if wallet already exists
    let wallet = await this.prisma.creditWallet.findUnique({
      where: { userId },
    });

    if (wallet) {
      return wallet;
    }

    // Create new wallet
    wallet = await this.prisma.creditWallet.create({
      data: {
        userId,
        balance: new Decimal(0),
        totalEarned: new Decimal(0),
        totalSpent: new Decimal(0),
      },
    });

    return wallet;
  }

  async getWallet(userId: string): Promise<any> {
    let wallet = await this.prisma.creditWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.initializeWallet(userId);
    }

    return wallet;
  }

  async addCredit(userId: string, dto: AddCreditDto): Promise<any> {
    this.logger.log(`Adding ${dto.amount} credits to user: ${userId}`);

    const wallet = await this.getWallet(userId);

    const newBalance = wallet.balance + new Decimal(dto.amount);

    // Record transaction
    const transaction = await this.prisma.creditTransaction.create({
      data: {
        walletId: wallet.id,
        amount: dto.amount,
        type: 'CREDIT',
        reason: dto.reason,
        metadata: dto.metadata,
        balanceAfter: newBalance,
      },
    });

    // Update wallet
    await this.prisma.creditWallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
        totalEarned: wallet.totalEarned + new Decimal(dto.amount),
      },
    });

    // Queue event
    await this.billingQueue.add(
      'credit-added',
      { userId, amount: dto.amount, reason: dto.reason },
      { removeOnComplete: true },
    );

    return transaction;
  }

  async deductCredit(userId: string, dto: DeductCreditDto): Promise<any> {
    this.logger.log(`Deducting ${dto.amount} credits from user: ${userId}`);

    const wallet = await this.getWallet(userId);

    if (wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient credits');
    }

    const newBalance = wallet.balance - new Decimal(dto.amount);

    // Record transaction
    const transaction = await this.prisma.creditTransaction.create({
      data: {
        walletId: wallet.id,
        amount: dto.amount,
        type: 'DEBIT',
        reason: dto.reason,
        referenceId: dto.referenceId,
        metadata: dto.metadata,
        balanceAfter: newBalance,
      },
    });

    // Update wallet
    await this.prisma.creditWallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
        totalSpent: wallet.totalSpent + new Decimal(dto.amount),
      },
    });

    // Queue event
    await this.billingQueue.add(
      'credit-deducted',
      {
        userId,
        amount: dto.amount,
        reason: dto.reason,
        referenceId: dto.referenceId,
      },
      { removeOnComplete: true },
    );

    return transaction;
  }

  async checkBalance(userId: string, requiredAmount: number): Promise<boolean> {
    const wallet = await this.getWallet(userId);
    return wallet.balance >= requiredAmount;
  }

  async getTransactionHistory(userId: string, limit: number = 100): Promise<CreditTransaction[]> {
    const wallet = await this.getWallet(userId);

    return this.prisma.creditTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async refundCredit(userId: string, amount: number, reason: string): Promise<any> {
    return this.addCredit(userId, {
      amount,
      reason: `REFUND: ${reason}`,
      metadata: { type: 'refund' },
    });
  }
}

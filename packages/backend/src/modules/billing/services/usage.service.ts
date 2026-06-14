import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UsageRecord } from '../entities/billing.entity';

export interface RecordUsageDto {
  userId: string;
  resourceType: string;
  resourceId: string;
  quantity: number;
  costPerUnit: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  private readonly costPerUnit = {
    CHAT_TOKENS: 0.00002, // $0.00002 per token
    AGENT_EXECUTION: 0.01, // $0.01 per execution
    APP_GENERATION: 0.10, // $0.10 per app
    DEPLOYMENT: 0.05, // $0.05 per deployment
    ANALYTICS_QUERY: 0.001, // $0.001 per query
  };

  constructor(private prisma: PrismaService) {}

  async recordUsage(dto: RecordUsageDto): Promise<UsageRecord> {
    this.logger.log(
      `Recording usage: ${dto.resourceType} x${dto.quantity} for user: ${dto.userId}`,
    );

    const costPerUnit = this.costPerUnit[dto.resourceType as keyof typeof this.costPerUnit] || 0;
    const totalCost = dto.quantity * costPerUnit;

    const billingMonth = new Date();
    billingMonth.setDate(1);
    billingMonth.setHours(0, 0, 0, 0);

    return this.prisma.usageRecord.create({
      data: {
        userId: dto.userId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        quantity: dto.quantity,
        costPerUnit,
        totalCost,
        billingMonth,
        invoiced: false,
      },
    });
  }

  async getMonthlyUsage(userId: string): Promise<{
    totalUsage: number;
    totalCost: number;
    byType: Record<string, { quantity: number; cost: number }>;
  }> {
    const billingMonth = new Date();
    billingMonth.setDate(1);
    billingMonth.setHours(0, 0, 0, 0);

    const records = await this.prisma.usageRecord.findMany({
      where: {
        userId,
        billingMonth,
      },
    });

    let totalUsage = 0;
    let totalCost = 0;
    const byType: Record<string, { quantity: number; cost: number }> = {};

    for (const record of records) {
      totalUsage += record.quantity;
      totalCost += record.totalCost;

      if (!byType[record.resourceType]) {
        byType[record.resourceType] = { quantity: 0, cost: 0 };
      }

      byType[record.resourceType].quantity += record.quantity;
      byType[record.resourceType].cost += record.totalCost;
    }

    return {
      totalUsage,
      totalCost,
      byType,
    };
  }

  async getUserUsageStats(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.usageRecord.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const daily: Record<string, { quantity: number; cost: number }> = {};

    for (const record of records) {
      const day = record.createdAt.toISOString().split('T')[0];
      if (!daily[day]) {
        daily[day] = { quantity: 0, cost: 0 };
      }
      daily[day].quantity += record.quantity;
      daily[day].cost += record.totalCost;
    }

    return {
      records,
      dailyStats: daily,
      totalQuantity: records.reduce((sum, r) => sum + r.quantity, 0),
      totalCost: records.reduce((sum, r) => sum + r.totalCost, 0),
    };
  }
}

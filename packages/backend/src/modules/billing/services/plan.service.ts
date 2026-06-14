import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Plan, PlanType } from '../entities/billing.entity';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(private prisma: PrismaService) {}

  async createPlan(dto: CreatePlanDto): Promise<any> {
    this.logger.log(`Creating plan: ${dto.type}`);

    return this.prisma.plan.create({
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        monthlyPrice: dto.monthlyPrice,
        yearlyPrice: dto.yearlyPrice,
        features: dto.features,
        active: true,
      },
    });
  }

  async getAllPlans(): Promise<any[]> {
    return this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async getPlanById(id: string): Promise<any> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan not found: ${id}`);
    }

    return plan;
  }

  async getPlanByType(type: PlanType): Promise<any> {
    const plan = await this.prisma.plan.findFirst({
      where: { type, active: true },
    });

    if (!plan) {
      throw new NotFoundException(`Plan not found: ${type}`);
    }

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<any> {
    this.logger.log(`Updating plan: ${id}`);

    return this.prisma.plan.update({
      where: { id },
      data: dto,
    });
  }

  async deactivatePlan(id: string): Promise<any> {
    return this.prisma.plan.update({
      where: { id },
      data: { active: false },
    });
  }

  async getFeatureLimit(planType: PlanType, feature: string): Promise<number> {
    const plan = await this.getPlanByType(planType);

    const featureKey = feature.toLowerCase().replace(/\s+/g, '');
    return (plan.features as any)[featureKey] || 0;
  }

  async checkFeatureAccess(planType: PlanType, feature: string): Promise<boolean> {
    const plan = await this.getPlanByType(planType);
    const features = plan.features as any;

    return Boolean(features[feature.toLowerCase().replace(/\s+/g, '')]);
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Invoice, PaymentStatus } from '../entities/billing.entity';
import { CreateInvoiceDto } from '../dto/invoice.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('billing') private billingQueue: Queue,
  ) {}

  async createInvoice(dto: CreateInvoiceDto): Promise<any> {
    this.logger.log(`Creating invoice for user: ${dto.userId}`);

    // Get usage records for period
    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        userId: dto.userId,
        billingMonth: {
          gte: dto.periodStart,
          lte: dto.periodEnd,
        },
        invoiced: false,
      },
    });

    // Calculate totals
    const lineItems = this.groupUsageByType(usageRecords);
    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = Math.round(subtotal * 0.1); // 10% tax placeholder
    const total = subtotal + taxAmount;

    // Create invoice
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        userId: dto.userId,
        subscriptionId: dto.subscriptionId,
        invoiceNumber,
        amount: total,
        currency: 'USD',
        taxAmount,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: PaymentStatus.PENDING,
        lineItems,
        metadata: dto.metadata,
      },
    });

    // Mark usage records as invoiced
    await this.prisma.usageRecord.updateMany({
      where: {
        id: { in: usageRecords.map((r) => r.id) },
      },
      data: { invoiced: true, invoiceId: invoice.id },
    });

    // Queue invoice event
    await this.billingQueue.add(
      'invoice-created',
      { invoiceId: invoice.id, userId: dto.userId },
      { removeOnComplete: true },
    );

    return invoice;
  }

  async getInvoices(userId: string, limit: number = 50): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getInvoice(id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${id}`);
    }

    return invoice;
  }

  async markInvoicePaid(invoiceId: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      },
    });
  }

  async generatePdfInvoice(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoice(invoiceId);

    // Placeholder for PDF generation
    // In production, would use something like pdfkit, puppeteer, etc.
    this.logger.log(`Generating PDF for invoice: ${invoiceId}`);

    return Buffer.from(`Invoice: ${invoice.invoiceNumber}`);
  }

  private groupUsageByType(
    records: any[],
  ): Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> {
    const grouped: Record<string, any> = {};

    for (const record of records) {
      if (!grouped[record.resourceType]) {
        grouped[record.resourceType] = {
          description: record.resourceType,
          quantity: 0,
          unitPrice: record.costPerUnit,
          totalPrice: 0,
        };
      }

      grouped[record.resourceType].quantity += record.quantity;
      grouped[record.resourceType].totalPrice += record.totalCost;
    }

    return Object.values(grouped);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: `INV-${year}${month}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
}

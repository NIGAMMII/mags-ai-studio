import { IsString, IsOptional, IsDate } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsDate()
  periodStart: Date;

  @IsDate()
  periodEnd: Date;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class InvoiceResponseDto {
  id: string;
  userId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  taxAmount: number;
  status: string;
  paidAt?: Date;
  createdAt: Date;
}

export class InvoiceDetailDto extends InvoiceResponseDto {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

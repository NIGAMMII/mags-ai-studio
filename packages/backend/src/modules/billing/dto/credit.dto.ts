import { IsNumber, IsString, IsOptional } from 'class-validator';

export class AddCreditDto {
  @IsNumber()
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class DeductCreditDto {
  @IsNumber()
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreditWalletResponseDto {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: Date;
}

export class CreditTransactionResponseDto {
  id: string;
  amount: number;
  type: string;
  reason: string;
  balanceAfter: number;
  createdAt: Date;
}

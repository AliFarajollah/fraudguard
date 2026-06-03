import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsObject } from 'class-validator';

/**
 * DTO for creating a single transaction.
 * The features object must include Time, Amount, and V1–V28 (PCA components).
 */
export class CreateTransactionDto {
    @ApiProperty({ example: 149.62, description: 'Transaction amount in EUR' })
    @IsNumber()
    amount: number;

    @ApiProperty({ example: '2024-01-15T14:30:00Z', description: 'When the transaction occurred (ISO 8601)' })
    @IsDateString()
    occurredAt: string;

    @ApiProperty({
        description: 'Feature vector: Time, Amount, V1–V28 (PCA components from the dataset)',
        example: { Time: 0, Amount: 149.62, V1: -1.36, V2: -0.07 },
    })
    @IsObject()
    features: Record<string, number>;
}

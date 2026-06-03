import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * DTO for bulk-scoring multiple transactions at once.
 * Each element in the array follows the same schema as CreateTransactionDto.
 */
export class BulkScoreDto {
    @ApiProperty({
        type: [CreateTransactionDto],
        description: 'Array of transaction feature vectors to score',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateTransactionDto)
    transactions: CreateTransactionDto[];
}

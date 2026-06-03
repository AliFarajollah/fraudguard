import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsIn, IsOptional, IsString } from 'class-validator';

/**
 * DTO for submitting a manual review decision on a flagged prediction.
 */
export class CreateReviewDto {
    @ApiProperty({ example: 1, description: 'ID of the Prediction being reviewed' })
    @IsNumber()
    predictionId: number;

    @ApiProperty({
        enum: ['confirmed_fraud', 'false_positive', 'needs_investigation'],
        example: 'confirmed_fraud',
        description: "The analyst's decision on this prediction",
    })
    @IsIn(['confirmed_fraud', 'false_positive', 'needs_investigation'])
    decision: string;

    @ApiPropertyOptional({
        example: 'Unusually high amount from a foreign country at 3am',
        description: 'Optional free-text notes from the analyst',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}

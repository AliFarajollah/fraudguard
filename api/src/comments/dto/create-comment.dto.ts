import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty({ example: 'Transaction matches pattern from fraud ring #FG-2024-041' })
    @IsString()
    @MinLength(3)
    @MaxLength(1000)
    content: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'currentpass123' })
    @IsOptional()
    @IsString()
    @MinLength(8)
    currentPassword?: string;

    @ApiPropertyOptional({ example: 'newpass456' })
    @IsOptional()
    @IsString()
    @MinLength(8)
    newPassword?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsNumber,
    IsBoolean,
    IsEmail,
    Min,
    Max,
} from 'class-validator';

export class UpdateAlertSettingsDto {
    @ApiPropertyOptional({ example: 0.8, minimum: 0.1, maximum: 1.0 })
    @IsOptional()
    @IsNumber()
    @Min(0.1)
    @Max(1.0)
    fraudThreshold?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    notificationsEnabled?: boolean;

    @ApiPropertyOptional({ example: 'analyst@bank.com' })
    @IsOptional()
    @IsEmail()
    alertEmail?: string;
}

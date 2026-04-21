import { IsEmail, IsIn, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
    @ApiProperty({ example: 'analyst@bank.com', description: 'Valid email address' })
    @IsEmail({}, { message: 'Must be a valid email address' })
    email: string;

    @ApiProperty({ example: 'password123', minLength: 8 })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;

    @ApiPropertyOptional({
        example: 'analyst',
        enum: ['admin', 'analyst', 'viewer'],
        description: 'Access level (defaults to analyst)',
    })
    @IsOptional()
    @IsIn(['admin', 'analyst', 'viewer'], {
        message: 'Role must be one of: admin, analyst, viewer',
    })
    role?: UserRole;
}
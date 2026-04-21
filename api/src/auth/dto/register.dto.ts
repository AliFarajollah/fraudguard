import { IsEmail, IsIn, IsOptional, MinLength } from 'class-validator';
import type { UserRole } from '../../users/entities/user.entity';

/**
 * Body shape for POST /auth/register.
 *
 * class-validator decorators run BEFORE the controller method executes.
 * If validation fails, NestJS auto-responds with 400 Bad Request
 * and a detailed list of violations — no manual checking required.
 */
export class RegisterDto {
    @IsEmail({}, { message: 'Must be a valid email address' })
    email: string;

    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;

    @IsOptional()
    @IsIn(['admin', 'analyst', 'viewer'], {
        message: 'Role must be one of: admin, analyst, viewer',
    })
    role?: UserRole;
}
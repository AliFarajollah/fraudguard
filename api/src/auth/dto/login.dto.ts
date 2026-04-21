import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * Body shape for POST /auth/login.
 *
 * No MinLength on password — we let the comparison fail naturally
 * and return a generic 401 rather than leaking password policy.
 */
export class LoginDto {
    @IsEmail({}, { message: 'Must be a valid email address' })
    email: string;

    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * AuthController — HTTP interface for registration, login, and profile.
 *
 *   POST /auth/register  → create account + return token
 *   POST /auth/login     → exchange credentials for token
 *   GET  /auth/me        → return the authenticated user (protected)
 */
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED) // 201
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK) // 200 (default for POST would be 201)
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    /**
     * Returns the current user's profile.
     * This endpoint is protected — requests without a valid JWT get 401.
     */
    @Get('me')
    @UseGuards(JwtAuthGuard)
    getProfile(@CurrentUser() user: User) {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
}
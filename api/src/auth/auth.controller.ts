import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ─── POST /auth/register ──────────────────────────────────────────────────
    // Rate limit: 3 registrations per hour per IP
    @Post('register')
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { ttl: 3600000, limit: 3 } })
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new account (non-admins start as pending)' })
    @ApiResponse({ status: 201, description: 'Admin: returns access_token + user. Non-admin: returns { pending: true, message }' })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    @ApiResponse({ status: 429, description: 'Too many registrations — try again later' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    // ─── POST /auth/login ─────────────────────────────────────────────────────
    // Rate limit: 5 attempts per minute per IP — brute-force protection
    @Post('login')
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Exchange credentials for a JWT' })
    @ApiResponse({ status: 200, description: 'Authenticated — returns access_token and user' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ApiResponse({ status: 403, description: 'Account pending approval or rejected' })
    @ApiResponse({ status: 429, description: 'Too many login attempts — wait 60 seconds' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    // ─── GET /auth/me ─────────────────────────────────────────────────────────
    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Return the authenticated user profile (protected)' })
    @ApiResponse({ status: 200, description: 'Current user profile' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getProfile(@CurrentUser() user: User) {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
}
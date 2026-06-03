import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * AuthService — business logic for registration and login.
 *
 * Security hardening:
 *  - New non-admin accounts start as 'pending' and cannot log in until approved.
 *  - Login checks account status and returns clear, actionable error messages.
 *  - bcrypt cost factor 10 (~100ms on modern CPU).
 */
@Injectable()
export class AuthService {
    private readonly BCRYPT_ROUNDS = 10;

    constructor(
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>,
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Create a new user.
     *  - Admin registrations are auto-approved (status: 'active').
     *  - All other roles start as 'pending' and require admin approval.
     *  - Returns { pending: true } (no token) for pending accounts.
     *  - Returns { access_token, user } for auto-approved admins.
     */
    async register(dto: RegisterDto) {
        const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
        const role = dto.role ?? 'analyst';

        // Admin accounts are auto-approved; everyone else waits for approval
        const status = role === 'admin' ? 'active' : 'pending';

        const user = this.usersRepo.create({ email: dto.email, passwordHash, role, status });
        await this.usersRepo.save(user);

        if (status === 'pending') {
            // Do NOT issue a JWT — the account needs approval first
            return {
                pending: true,
                message: 'Your account has been created and is awaiting admin approval. You will be able to log in once approved.',
            };
        }

        return this.buildAuthResponse(user);
    }

    /**
     * Verify credentials and return an access token.
     * Enforces account status checks AFTER password verification to prevent
     * leaking which emails are registered.
     */
    async login(dto: LoginDto) {
        const user = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Status check AFTER password — prevents email enumeration via error timing
        if (user.status === 'pending') {
            throw new ForbiddenException(
                'Your account is pending admin approval. Please wait for an administrator to activate your account.',
            );
        }

        if (user.status === 'rejected') {
            throw new ForbiddenException(
                'Your account registration was not approved. Please contact your administrator.',
            );
        }

        return this.buildAuthResponse(user);
    }

    /**
     * Builds the response shape used by both register (admin) and login.
     * Strips the password hash before returning.
     */
    private buildAuthResponse(user: User) {
        const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
        const access_token = this.jwtService.sign(payload);
        const { passwordHash, ...safeUser } = user;
        return { access_token, user: safeUser };
    }
}
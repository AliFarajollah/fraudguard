import {
    Injectable,
    UnauthorizedException,
    ConflictException,
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
 * Keeps HTTP concerns (status codes, request/response shape) in the
 * controller, and auth logic (hashing, token signing) here.
 */
@Injectable()
export class AuthService {
    // bcrypt cost factor: 10 is the common default (~100ms per hash on modern CPU)
    private readonly BCRYPT_ROUNDS = 10;

    constructor(
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>,
        private readonly jwtService: JwtService,
    ) { }

    /**
     * Create a new user.
     * - Checks email uniqueness
     * - Hashes password with bcrypt
     * - Returns { access_token, user } so the client can log in immediately
     */
    async register(dto: RegisterDto) {
        const existing = await this.usersRepo.findOne({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

        const user = this.usersRepo.create({
            email: dto.email,
            passwordHash,
            role: dto.role ?? 'analyst',
        });
        await this.usersRepo.save(user);

        return this.buildAuthResponse(user);
    }

    /**
     * Verify credentials and return an access token.
     * - Always returns the same 401 message to prevent email enumeration
     */
    async login(dto: LoginDto) {
        const user = await this.usersRepo.findOne({
            where: { email: dto.email },
        });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.buildAuthResponse(user);
    }

    /**
     * Builds the response shape used by both register and login.
     * Strips the password hash from the user object before returning.
     */
    private buildAuthResponse(user: User) {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const access_token = this.jwtService.sign(payload);

        // Never send passwordHash back to the client
        const { passwordHash, ...safeUser } = user;

        return { access_token, user: safeUser };
    }
}
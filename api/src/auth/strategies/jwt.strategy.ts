import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

/**
 * Payload embedded in every JWT we issue.
 * Stays small on purpose — the whole JWT travels in every HTTP header.
 */
export interface JwtPayload {
    sub: number;      // "subject" — standard JWT claim for user ID
    email: string;
    role: string;
}

/**
 * JwtStrategy — runs on every request that hits a protected endpoint.
 *
 * Steps performed automatically by passport-jwt:
 *   1. Pull the token from the Authorization: Bearer <token> header
 *   2. Verify its signature using JWT_SECRET
 *   3. Check it hasn't expired
 *   4. If valid, call validate() below with the decoded payload
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') as string,
        });
    }

    /**
     * Called after passport has successfully verified the JWT.
     * We do a final check that the user still exists in the DB
     * (token could be valid but user may have been deleted).
     *
     * Whatever this returns is attached to the request as `req.user`.
     */
    async validate(payload: JwtPayload): Promise<User> {
        const user = await this.usersService.findByEmail(payload.email);
        if (!user) {
            throw new UnauthorizedException('User no longer exists');
        }
        return user;
    }
}
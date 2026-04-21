import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — decorator used on controllers to protect endpoints.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('protected')
 *   someRoute() { ... }
 *
 * If no valid token → NestJS returns 401 automatically.
 * If valid token → the request proceeds, with req.user set.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }
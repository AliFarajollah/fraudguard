import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * @CurrentUser() — custom decorator for controller methods.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: User) {
 *     return user;
 *   }
 *
 * The User object comes from JwtStrategy.validate(), which attached
 * it to the request. This decorator just pulls it back out so the
 * controller doesn't need to touch @Req() / req.user directly.
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): User => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
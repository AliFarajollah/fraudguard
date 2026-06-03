import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * RolesGuard — enforces role-based access control on routes decorated with @Roles(...).
 *
 * How it works:
 * 1. Reads the 'roles' metadata set by @Roles decorator
 * 2. If no roles metadata → the route is not role-restricted (passes through)
 * 3. Checks req.user.role (populated by JwtStrategy after JWT validation)
 * 4. If user's role is in the allowed list → allow access
 * 5. Otherwise → throw ForbiddenException (403)
 *
 * Must be used AFTER JwtAuthGuard, because it relies on req.user being populated.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin', 'analyst')
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Get the allowed roles from the route's metadata
        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        // If @Roles was not applied, allow everyone (no role restriction)
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        // Extract the authenticated user from the request (set by JwtStrategy)
        const { user } = context.switchToHttp().getRequest<{ user: { role: string } }>();

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        if (!requiredRoles.includes(user.role)) {
            throw new ForbiddenException(
                `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`,
            );
        }

        return true;
    }
}

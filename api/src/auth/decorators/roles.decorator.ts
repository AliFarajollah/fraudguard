import { SetMetadata } from '@nestjs/common';

/**
 * @Roles decorator — marks a route with the roles allowed to access it.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin', 'analyst')
 *   @Post()
 *   create(...) { ... }
 *
 * The RolesGuard reads this metadata and compares it to req.user.role.
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * UsersController — admin-only endpoints for user management.
 *
 * All routes require:
 *   1. A valid JWT (JwtAuthGuard)
 *   2. The 'admin' role (RolesGuard + @Roles)
 */
@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    // ─── GET /users ───────────────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: 'List all users — admin only' })
    @ApiResponse({ status: 200, description: 'Array of all users (passwordHash omitted)' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Admin role required' })
    findAll() {
        return this.usersService.findAll();
    }

    // ─── GET /users/pending ───────────────────────────────────────────────────

    @Get('pending')
    @ApiOperation({ summary: 'List accounts awaiting approval — admin only' })
    @ApiResponse({ status: 200, description: 'Array of pending users ordered by registration date' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Admin role required' })
    findPending() {
        return this.usersService.findPending();
    }

    // ─── GET /users/pending/count ─────────────────────────────────────────────

    @Get('pending/count')
    @ApiOperation({ summary: 'Count of pending accounts — used for nav badge' })
    @ApiResponse({ status: 200, description: '{ count: number }' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Admin role required' })
    async countPending() {
        const count = await this.usersService.countPending();
        return { count };
    }

    // ─── PATCH /users/:id/role ────────────────────────────────────────────────

    @Patch(':id/role')
    @ApiOperation({ summary: "Update a user's role — admin only" })
    @ApiResponse({ status: 200, description: 'Updated user object (passwordHash omitted)' })
    @ApiResponse({ status: 400, description: 'Invalid role value' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Admin role required' })
    @ApiResponse({ status: 404, description: 'User not found' })
    updateRole(
        @Param('id', ParseIntPipe) id: number,
        @Body('role') role: string,
    ) {
        return this.usersService.updateRole(id, role);
    }

    // ─── PATCH /users/:id/status ──────────────────────────────────────────────

    @Patch(':id/status')
    @ApiOperation({ summary: "Approve or reject a pending account — admin only" })
    @ApiResponse({ status: 200, description: "Updated user object with new status" })
    @ApiResponse({ status: 400, description: 'Invalid status value' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Admin role required' })
    @ApiResponse({ status: 404, description: 'User not found' })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: string,
    ) {
        return this.usersService.updateStatus(id, status);
    }
}

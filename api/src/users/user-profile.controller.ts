import {
    Controller,
    Get,
    Patch,
    Body,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from './entities/user.entity';

interface RequestWithUser extends Request {
    user: { sub: number; email: string; role: string } & User;
}

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserProfileController {
    constructor(
        private readonly usersService: UsersService,
        private readonly audit: AuditService,
    ) {}

    @Get('me')
    @ApiOperation({ summary: 'Get own profile' })
    @ApiResponse({ status: 200, description: 'Current user profile (no passwordHash)' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getMe(@Request() req: RequestWithUser) {
        return this.usersService.getProfile(req.user);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Change own password' })
    @ApiResponse({ status: 200, description: 'Password updated' })
    @ApiResponse({ status: 400, description: 'Passwords missing or do not meet requirements' })
    @ApiResponse({ status: 401, description: 'Current password incorrect or missing JWT' })
    async updateMe(
        @Request() req: RequestWithUser,
        @Body() dto: UpdateProfileDto,
    ) {
        if (!dto.currentPassword || !dto.newPassword) {
            throw new BadRequestException('currentPassword and newPassword are required');
        }
        await this.usersService.updatePassword(req.user.sub, dto.currentPassword, dto.newPassword);
        void this.audit.log('PASSWORD_CHANGED', req.user.sub, 'user', req.user.sub);
        return { message: 'Password updated successfully' };
    }

    @Get('me/activity')
    @ApiOperation({ summary: "Own recent activity from the audit log" })
    @ApiResponse({ status: 200, description: 'Last 50 audit entries for current user' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getActivity(@Request() req: RequestWithUser) {
        return this.audit.findByUser(req.user.sub, 50);
    }
}

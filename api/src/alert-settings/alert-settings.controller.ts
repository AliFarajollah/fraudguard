import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AlertSettingsService } from './alert-settings.service';
import { UpdateAlertSettingsDto } from './dto/update-alert-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser extends Request {
    user: { sub: number; email: string; role: string };
}

@ApiTags('alert-settings')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('alert-settings')
export class AlertSettingsController {
    constructor(private readonly service: AlertSettingsService) {}

    @Get('me')
    @ApiOperation({ summary: "Get current user's alert settings" })
    @ApiResponse({ status: 200, description: 'Alert settings for current user' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getMe(@Request() req: RequestWithUser) {
        return this.service.getForUser(req.user.sub);
    }

    @Put('me')
    @ApiOperation({ summary: "Update current user's alert settings" })
    @ApiResponse({ status: 200, description: 'Updated alert settings' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    updateMe(
        @Request() req: RequestWithUser,
        @Body() dto: UpdateAlertSettingsDto,
    ) {
        return this.service.updateForUser(req.user.sub, dto);
    }

    @Get('global')
    @UseGuards(RolesGuard)
    @Roles('admin')
    @ApiOperation({ summary: 'Get platform-wide default alert settings — admin only' })
    @ApiResponse({ status: 200, description: 'Global alert settings' })
    @ApiResponse({ status: 403, description: 'Admin only' })
    getGlobal() {
        return this.service.getGlobal();
    }

    @Put('global')
    @UseGuards(RolesGuard)
    @Roles('admin')
    @ApiOperation({ summary: 'Update platform-wide default alert settings — admin only' })
    @ApiResponse({ status: 200, description: 'Updated global settings' })
    @ApiResponse({ status: 403, description: 'Admin only' })
    updateGlobal(@Body() dto: UpdateAlertSettingsDto) {
        return this.service.updateGlobal(dto);
    }
}

import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser extends Request {
    user: { sub: number; email: string; role: string };
}

@ApiTags('audit')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get()
    @UseGuards(RolesGuard)
    @Roles('admin')
    @ApiOperation({ summary: 'Paginated activity feed — admin only' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 20 })
    @ApiQuery({ name: 'action', required: false })
    @ApiQuery({ name: 'userId', required: false })
    @ApiQuery({ name: 'entityType', required: false })
    @ApiResponse({ status: 200, description: 'Paginated audit logs' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Admin only' })
    findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('action') action?: string,
        @Query('userId') userId?: string,
        @Query('entityType') entityType?: string,
    ) {
        return this.auditService.findAll(
            parseInt(page, 10),
            parseInt(limit, 10),
            action,
            userId ? parseInt(userId, 10) : undefined,
            entityType,
        );
    }

    @Get('my')
    @ApiOperation({ summary: "Current user's own activity (last 50)" })
    @ApiResponse({ status: 200, description: 'List of audit entries for current user' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findMine(@Request() req: RequestWithUser) {
        return this.auditService.findByUser(req.user.sub, 50);
    }

    @Get('entity/:type/:id')
    @ApiOperation({ summary: 'All audit actions on a specific entity' })
    @ApiResponse({ status: 200, description: 'Audit entries for the given entity' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findByEntity(
        @Param('type') type: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.auditService.findByEntity(type, id);
    }
}

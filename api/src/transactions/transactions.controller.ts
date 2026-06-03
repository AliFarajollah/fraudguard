import {
    Controller,
    Get,
    Post,
    Body,
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

import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { BulkScoreDto } from './dto/bulk-score.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/** req.user shape after JWT validation */
interface RequestWithUser extends Request {
    user: { sub: number; email: string; role: string };
}

@ApiTags('transactions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
    constructor(private readonly service: TransactionsService) {}

    // ─── POST /transactions ───────────────────────────────────────────────────

    @Post()
    @UseGuards(RolesGuard)
    @Roles('admin', 'analyst')
    @ApiOperation({ summary: 'Create a transaction and score it immediately via the ML service (analyst/admin only)' })
    @ApiResponse({ status: 201, description: 'Transaction created and scored' })
    @ApiResponse({ status: 400, description: 'Validation error in request body' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Insufficient role — viewer cannot score transactions' })
    @ApiResponse({ status: 500, description: 'ML service unreachable' })
    create(@Body() dto: CreateTransactionDto, @Request() req: RequestWithUser) {
        // req.user is populated by JwtStrategy — contains the logged-in user's id
        return this.service.createOne(dto, req.user as any);
    }

    // ─── POST /transactions/bulk ──────────────────────────────────────────────

    @Post('bulk')
    @UseGuards(RolesGuard)
    @Roles('admin', 'analyst')
    @ApiOperation({ summary: 'Score multiple transactions at once — analyst/admin only' })
    @ApiResponse({ status: 201, description: 'Returns { processed, failed, results }' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Insufficient role — viewer cannot bulk upload' })
    createBulk(@Body() dto: BulkScoreDto, @Request() req: RequestWithUser) {
        return this.service.createBulk(dto, req.user as any);
    }

    // ─── GET /transactions/stats ──────────────────────────────────────────────

    @Get('stats')
    @ApiOperation({ summary: 'Get aggregate transaction counts (total, pending, scored, fraud, FP)' })
    @ApiResponse({ status: 200, description: 'Aggregate stats object' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getStats() {
        return this.service.getStats();
    }

    // ─── GET /transactions ────────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: 'List all transactions — paginated, filterable by status and predicted label' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 20 })
    @ApiQuery({ name: 'status', required: false, enum: ['pending', 'scored', 'reviewed'] })
    @ApiQuery({ name: 'predictedLabel', required: false, enum: ['true', 'false'] })
    @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('status') status?: string,
        @Query('predictedLabel') predictedLabel?: string,
    ) {
        return this.service.findAll(
            parseInt(page, 10),
            parseInt(limit, 10),
            status,
            predictedLabel,
        );
    }

    // ─── GET /transactions/:id ────────────────────────────────────────────────

    @Get(':id')
    @ApiOperation({ summary: 'Get a single transaction with nested prediction and review' })
    @ApiResponse({ status: 200, description: 'Transaction with nested prediction and review' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }
}

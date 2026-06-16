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
    Res,
    Header,
} from '@nestjs/common';
import type { Response } from 'express';
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

    // ─── GET /transactions/export ─────────────────────────────────────────────

    @Get('export')
    @Header('Content-Type', 'text/csv')
    @ApiOperation({ summary: 'Export all transactions as a CSV file' })
    @ApiResponse({ status: 200, description: 'CSV file download' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    async exportCsv(@Res() res: Response) {
        const date = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Disposition', `attachment; filename="fraudguard_transactions_${date}.csv"`);

        const data = await this.service.findAllForExport();
        const header = 'id,amount,occurred_at,status,fraud_probability,predicted_label,model_version,decision,reviewer,reviewed_at\n';
        const rows = data.map(t =>
            [
                t.id,
                t.amount,
                t.occurredAt,
                t.status,
                t.prediction?.fraudProbability ?? '',
                t.prediction?.predictedLabel ?? '',
                t.prediction?.modelVersion ?? '',
                (t.prediction as any)?.review?.decision ?? '',
                (t.prediction as any)?.review?.analyst?.email ?? '',
                (t.prediction as any)?.review?.reviewedAt ?? '',
            ].join(',')
        ).join('\n');

        res.send(header + rows);
    }

    // ─── GET /transactions ────────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: 'List all transactions — paginated, filterable by status, label, amount, date, probability' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 20 })
    @ApiQuery({ name: 'status', required: false, enum: ['pending', 'scored', 'reviewed'] })
    @ApiQuery({ name: 'predictedLabel', required: false, enum: ['true', 'false'] })
    @ApiQuery({ name: 'minAmount', required: false })
    @ApiQuery({ name: 'maxAmount', required: false })
    @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
    @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
    @ApiQuery({ name: 'minProbability', required: false })
    @ApiQuery({ name: 'maxProbability', required: false })
    @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('status') status?: string,
        @Query('predictedLabel') predictedLabel?: string,
        @Query('minAmount') minAmount?: string,
        @Query('maxAmount') maxAmount?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('minProbability') minProbability?: string,
        @Query('maxProbability') maxProbability?: string,
    ) {
        return this.service.findAll(
            parseInt(page, 10),
            parseInt(limit, 10),
            status,
            predictedLabel,
            minAmount ? parseFloat(minAmount) : undefined,
            maxAmount ? parseFloat(maxAmount) : undefined,
            startDate,
            endDate,
            minProbability ? parseFloat(minProbability) : undefined,
            maxProbability ? parseFloat(maxProbability) : undefined,
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

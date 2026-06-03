import { Controller, Get, UseGuards } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { PredictionsService } from './predictions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('predictions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
    constructor(private readonly service: PredictionsService) {}

    // ─── GET /predictions/flagged ─────────────────────────────────────────────

    @Get('flagged')
    @ApiOperation({ summary: 'List fraud predictions without a review (analyst queue)' })
    @ApiResponse({ status: 200, description: 'Array of unreviewed fraud predictions, ordered by probability desc' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findFlagged() {
        return this.service.findFlagged();
    }

    // ─── GET /predictions/trends ─────────────────────────────────────────────────

    @Get('trends')
    @ApiOperation({ summary: 'Daily fraud vs legit prediction counts for the last 30 days (analytics)' })
    @ApiResponse({ status: 200, description: 'Array of { date, fraud, legit }' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getTrends() {
        return this.service.getTrends();
    }

    // ─── GET /predictions/risk-distribution ───────────────────────────────────────

    @Get('risk-distribution')
    @ApiOperation({ summary: 'Fraud probability bucketed into 10% ranges (analytics histogram)' })
    @ApiResponse({ status: 200, description: 'Array of { range, count }' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getRiskDistribution() {
        return this.service.getRiskDistribution();
    }

    // ─── GET /predictions/stats ───────────────────────────────────────────────

    @Get('stats')
    @ApiOperation({ summary: 'Get prediction aggregate stats (total, fraud, legit, avg probability, reviewed)' })
    @ApiResponse({ status: 200, description: 'Stats object' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getStats() {
        return this.service.getStats();
    }

    // ─── GET /predictions ─────────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: 'List all predictions with nested transactions' })
    @ApiResponse({ status: 200, description: 'Array of all predictions' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findAll() {
        return this.service.findAll();
    }
}

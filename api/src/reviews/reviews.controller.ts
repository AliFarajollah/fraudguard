import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/** req.user shape after JWT validation */
interface RequestWithUser extends Request {
    user: { sub: number; email: string; role: string };
}

@ApiTags('reviews')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly service: ReviewsService) {}

    // ─── POST /reviews ────────────────────────────────────────────────────────

    @Post()
    @UseGuards(RolesGuard)
    @Roles('admin', 'analyst')
    @ApiOperation({ summary: 'Submit a review decision for a flagged prediction (analyst/admin only)' })
    @ApiResponse({ status: 201, description: 'Review created, transaction status updated to reviewed' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    @ApiResponse({ status: 403, description: 'Insufficient role — only admin and analyst may review' })
    @ApiResponse({ status: 404, description: 'Prediction not found' })
    @ApiResponse({ status: 409, description: 'Prediction already reviewed' })
    create(@Body() dto: CreateReviewDto, @Request() req: RequestWithUser) {
        return this.service.create(dto, req.user as any);
    }

    // ─── GET /reviews/stats ───────────────────────────────────────────────────

    @Get('stats')
    @ApiOperation({ summary: 'Get review counts by decision type' })
    @ApiResponse({ status: 200, description: 'Stats object: { total, confirmed_fraud, false_positive, needs_investigation }' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    getStats() {
        return this.service.getStats();
    }

    // ─── GET /reviews ─────────────────────────────────────────────────────────

    @Get()
    @ApiOperation({ summary: 'List all reviews with nested prediction and analyst info' })
    @ApiResponse({ status: 200, description: 'Array of all reviews' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findAll() {
        return this.service.findAll();
    }
}

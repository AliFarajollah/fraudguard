import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Review } from './entities/review.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ReviewDecision } from './entities/review.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private readonly reviewRepo: Repository<Review>,

        @InjectRepository(Prediction)
        private readonly predRepo: Repository<Prediction>,

        @InjectRepository(Transaction)
        private readonly txRepo: Repository<Transaction>,

        private readonly audit: AuditService,
    ) {}

    /**
     * Creates a review for a flagged prediction.
     *
     * Business rules:
     * 1. Prediction must exist — NotFoundException if not
     * 2. Prediction must not already have a review — ConflictException if yes
     * 3. After saving the review, update the linked transaction status to 'reviewed'
     */
    async create(dto: CreateReviewDto, analyst: User): Promise<Review> {
        // 1. Load the prediction (we need it to link and to find the transaction)
        const prediction = await this.predRepo.findOne({
            where: { id: dto.predictionId },
            relations: ['transaction'],
        });

        if (!prediction) {
            throw new NotFoundException(`Prediction #${dto.predictionId} not found`);
        }

        // 2. Prevent duplicate reviews — each prediction can only be reviewed once
        const existing = await this.reviewRepo.findOne({
            where: { prediction: { id: dto.predictionId } },
        });

        if (existing) {
            throw new ConflictException(`Prediction #${dto.predictionId} has already been reviewed`);
        }

        // 3. Save the review
        const review = this.reviewRepo.create({
            prediction,
            analyst,
            decision: dto.decision as ReviewDecision,
            notes: dto.notes ?? null,
        });
        await this.reviewRepo.save(review);

        // 4. Update the linked transaction status to 'reviewed'
        await this.txRepo.update(prediction.transaction.id, { status: 'reviewed' });

        void this.audit.log('REVIEW_SUBMITTED', analyst.id, 'review', review.id, { decision: dto.decision });

        return review;
    }

    /**
     * Returns all reviews with nested prediction and analyst info.
     */
    async findAll(): Promise<Review[]> {
        return this.reviewRepo.find({
            relations: ['prediction', 'prediction.transaction', 'analyst'],
            order: { reviewedAt: 'DESC' },
        });
    }

    /**
     * Returns SLA statistics: how long it takes from ML scoring to analyst review.
     */
    async getSla(): Promise<{
        avg_hours_to_review: number;
        under_1h: number;
        under_4h: number;
        under_24h: number;
        over_24h: number;
    }> {
        const reviews = await this.reviewRepo.find({ relations: ['prediction'] });

        if (reviews.length === 0) {
            return { avg_hours_to_review: 0, under_1h: 0, under_4h: 0, under_24h: 0, over_24h: 0 };
        }

        let totalHours = 0;
        let under_1h = 0;
        let under_4h = 0;
        let under_24h = 0;
        let over_24h = 0;

        for (const review of reviews) {
            const hours = (review.reviewedAt.getTime() - review.prediction.createdAt.getTime()) / 3_600_000;
            totalHours += hours;
            if (hours < 1) under_1h++;
            else if (hours < 4) under_4h++;
            else if (hours < 24) under_24h++;
            else over_24h++;
        }

        return {
            avg_hours_to_review: parseFloat((totalHours / reviews.length).toFixed(2)),
            under_1h,
            under_4h,
            under_24h,
            over_24h,
        };
    }

    /**
     * Returns aggregate counts per decision type.
     */
    async getStats(): Promise<{
        total: number;
        confirmed_fraud: number;
        false_positive: number;
        needs_investigation: number;
    }> {
        const total = await this.reviewRepo.count();

        const confirmed_fraud = await this.reviewRepo.count({
            where: { decision: 'confirmed_fraud' },
        });

        const false_positive = await this.reviewRepo.count({
            where: { decision: 'false_positive' },
        });

        const needs_investigation = await this.reviewRepo.count({
            where: { decision: 'needs_investigation' },
        });

        return { total, confirmed_fraud, false_positive, needs_investigation };
    }
}

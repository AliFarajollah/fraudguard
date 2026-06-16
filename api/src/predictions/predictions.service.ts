import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prediction } from './entities/prediction.entity';
import { Review } from '../reviews/entities/review.entity';

@Injectable()
export class PredictionsService {
    constructor(
        @InjectRepository(Prediction)
        private readonly predRepo: Repository<Prediction>,

        @InjectRepository(Review)
        private readonly reviewRepo: Repository<Review>,
    ) {}

    /**
     * Returns all predictions with their linked transactions.
     * Used for the full predictions log.
     */
    async findAll(): Promise<Prediction[]> {
        return this.predRepo.find({
            relations: ['transaction', 'transaction.uploadedBy'],
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Returns only predictions that:
     *  - are flagged as fraud (predicted_label = true)
     *  - have NOT been reviewed yet (no linked review row)
     *
     * Ordered by fraud probability descending so the highest-risk cases
     * appear first in the analyst's queue.
     */
    async findFlagged(): Promise<Prediction[]> {
        return this.predRepo
            .createQueryBuilder('p')
            .leftJoin('p.review', 'r')           // join review (nullable — no JoinColumn on this side)
            .leftJoinAndSelect('p.transaction', 't') // include transaction data
            .leftJoinAndSelect('t.uploadedBy', 'user')
            .where('p.predicted_label = :label', { label: true })
            .andWhere('r.id IS NULL')             // only unreviewed
            .orderBy('p.fraud_probability', 'DESC')
            .getMany();
    }

    /**
     * Returns aggregate statistics for the dashboard.
     * avg_fraud_probability is the mean score across all scored transactions.
     */
    async getStats(): Promise<{
        total: number;
        fraud_count: number;
        legit_count: number;
        avg_fraud_probability: number;
        reviewed_count: number;
    }> {
        const total = await this.predRepo.count();

        const fraud_count = await this.predRepo.count({
            where: { predictedLabel: true },
        });

        const legit_count = total - fraud_count;

        // AVG computed in SQL for accuracy
        const avgResult = await this.predRepo
            .createQueryBuilder('p')
            .select('AVG(p.fraud_probability)', 'avg')
            .getRawOne<{ avg: string | null }>();

        const avg_fraud_probability = avgResult?.avg ? parseFloat(avgResult.avg) : 0;

        // Count predictions that have a linked review
        const reviewed_count = await this.predRepo
            .createQueryBuilder('p')
            .innerJoin('p.review', 'r')
            .getCount();

        return { total, fraud_count, legit_count, avg_fraud_probability, reviewed_count };
    }
    /**
     * Returns daily fraud vs legit counts for the last 30 days.
     * Used by the Analytics dashboard trend chart.
     */
    async getTrends(): Promise<Array<{ date: string; fraud: number; legit: number }>> {
        const raw = await this.predRepo
            .createQueryBuilder('p')
            .select("TO_CHAR(DATE_TRUNC('day', p.created_at), 'YYYY-MM-DD')", 'date')
            .addSelect("SUM(CASE WHEN p.predicted_label = true THEN 1 ELSE 0 END)::int", 'fraud')
            .addSelect("SUM(CASE WHEN p.predicted_label = false THEN 1 ELSE 0 END)::int", 'legit')
            .where("p.created_at >= NOW() - INTERVAL '30 days'")
            .groupBy("DATE_TRUNC('day', p.created_at)")
            .orderBy("DATE_TRUNC('day', p.created_at)", 'ASC')
            .getRawMany<{ date: string; fraud: string; legit: string }>();

        return raw.map(r => ({
            date: r.date,
            fraud: parseInt(r.fraud ?? '0', 10),
            legit:  parseInt(r.legit  ?? '0', 10),
        }));
    }

    /**
     * Buckets all predictions into 10 × 10% risk ranges.
     * e.g. [{ range: '0–10%', count: 34 }, { range: '10–20%', count: 12 }, ...]
     */
    async getRiskDistribution(): Promise<Array<{ range: string; count: number }>> {
        const raw = await this.predRepo
            .createQueryBuilder('p')
            .select('LEAST(FLOOR(p.fraud_probability::float * 10)::int, 9)', 'bucket')
            .addSelect('COUNT(*)::int', 'count')
            .groupBy('LEAST(FLOOR(p.fraud_probability::float * 10)::int, 9)')
            .orderBy('LEAST(FLOOR(p.fraud_probability::float * 10)::int, 9)', 'ASC')
            .getRawMany<{ bucket: string; count: string }>();

        const map = new Map(raw.map(r => [parseInt(r.bucket, 10), parseInt(r.count, 10)]));

        return Array.from({ length: 10 }, (_, i) => ({
            range: `${i * 10}–${(i + 1) * 10}%`,
            count: map.get(i) ?? 0,
        }));
    }

    /**
     * Production performance metrics derived from analyst review feedback.
     * Computes precision/recall from real verdicts, not initial test set metrics.
     */
    async getPerformance(): Promise<{
        daily: Array<{ date: string; total: number; flagged: number; confirmed_fraud: number; false_positive: number }>;
        precision: number;
        recall: number;
        total_reviewed: number;
    }> {
        // Daily breakdown for the last 30 days
        const daily = await this.predRepo
            .createQueryBuilder('p')
            .leftJoin('p.review', 'r')
            .select("TO_CHAR(DATE_TRUNC('day', p.created_at), 'YYYY-MM-DD')", 'date')
            .addSelect('COUNT(p.id)::int', 'total')
            .addSelect("SUM(CASE WHEN p.predicted_label = true THEN 1 ELSE 0 END)::int", 'flagged')
            .addSelect("SUM(CASE WHEN r.decision = 'confirmed_fraud' THEN 1 ELSE 0 END)::int", 'confirmed_fraud')
            .addSelect("SUM(CASE WHEN r.decision = 'false_positive' THEN 1 ELSE 0 END)::int", 'false_positive')
            .where("p.created_at >= NOW() - INTERVAL '30 days'")
            .groupBy("DATE_TRUNC('day', p.created_at)")
            .orderBy("DATE_TRUNC('day', p.created_at)", 'ASC')
            .getRawMany<{ date: string; total: string; flagged: string; confirmed_fraud: string; false_positive: string }>();

        // Overall verdict counts for precision/recall
        const confirmed = await this.reviewRepo.count({ where: { decision: 'confirmed_fraud' } });
        const fp = await this.reviewRepo.count({ where: { decision: 'false_positive' } });
        const total_reviewed = await this.reviewRepo.count();
        const total_flagged = await this.predRepo.count({ where: { predictedLabel: true } });

        const precision = (confirmed + fp) > 0 ? confirmed / (confirmed + fp) : 0;
        const recall = total_flagged > 0 ? confirmed / total_flagged : 0;

        return {
            daily: daily.map(d => ({
                date: d.date,
                total: parseInt(d.total ?? '0', 10),
                flagged: parseInt(d.flagged ?? '0', 10),
                confirmed_fraud: parseInt(d.confirmed_fraud ?? '0', 10),
                false_positive: parseInt(d.false_positive ?? '0', 10),
            })),
            precision: parseFloat(precision.toFixed(3)),
            recall: parseFloat(recall.toFixed(3)),
            total_reviewed,
        };
    }
}

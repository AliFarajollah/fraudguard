import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { Transaction } from './entities/transaction.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { User } from '../users/entities/user.entity';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { BulkScoreDto } from './dto/bulk-score.dto';
import { AuditService } from '../audit/audit.service';

/** Shape of the JSON response from FastAPI POST /predict */
interface MlPredictResponse {
    fraud_probability: number;
    predicted_label: boolean;
    threshold: number;
    model_version: string;
}

/** A single result entry in the bulk-score summary */
export interface BulkResultEntry {
    index: number;
    transactionId?: number;
    status: 'ok' | 'error';
    error?: string;
}

@Injectable()
export class TransactionsService {
    private readonly mlUrl: string;

    constructor(
        @InjectRepository(Transaction)
        private readonly txRepo: Repository<Transaction>,

        @InjectRepository(Prediction)
        private readonly predRepo: Repository<Prediction>,

        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly audit: AuditService,
    ) {
        // ML_SERVICE_URL is set in api/.env (e.g., http://localhost:8000)
        this.mlUrl = this.configService.get<string>('ML_SERVICE_URL') ?? 'http://localhost:8000';
    }

    /**
     * Calls FastAPI POST /predict with the transaction's feature vector.
     * Returns the raw ML response.
     */
    private async callMlPredict(features: Record<string, number>): Promise<MlPredictResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<MlPredictResponse>(`${this.mlUrl}/predict`, features),
            );
            return response.data;
        } catch {
            // Surface a readable error so the caller can decide how to handle it
            throw new InternalServerErrorException('ML service is unavailable or returned an error');
        }
    }

    /**
     * Creates one transaction, immediately scores it via FastAPI,
     * saves the prediction, and returns the transaction with the nested prediction.
     *
     * Scoring flow:
     * 1. Save Transaction (status=pending)
     * 2. POST features to FastAPI /predict
     * 3. Save Prediction linked to this transaction
     * 4. Update Transaction status to 'scored'
     * 5. Return Transaction with nested Prediction
     */
    async createOne(dto: CreateTransactionDto, user: User): Promise<Transaction> {
        // Step 1 — persist the transaction as 'pending'
        const tx = this.txRepo.create({
            uploadedBy: user,
            amount: dto.amount,
            occurredAt: new Date(dto.occurredAt),
            features: dto.features,
            status: 'pending',
        });
        await this.txRepo.save(tx);

        // Step 2 — call FastAPI
        const mlResult = await this.callMlPredict(dto.features);

        // Step 3 — persist the prediction
        const prediction = this.predRepo.create({
            transaction: tx,
            fraudProbability: mlResult.fraud_probability,
            predictedLabel: mlResult.predicted_label,
            modelVersion: mlResult.model_version,
        });
        await this.predRepo.save(prediction);

        // Step 4 — mark transaction as scored
        tx.status = 'scored';
        await this.txRepo.save(tx);

        // Step 5 — return transaction with nested prediction
        void this.audit.log('TRANSACTION_SCORED', user.id, 'transaction', tx.id, {
            amount: dto.amount,
            fraudProbability: mlResult.fraud_probability,
        });
        return this.findOne(tx.id);
    }

    /**
     * Bulk-scores an array of transactions.
     * Each transaction is scored independently; failures are captured and counted.
     * Returns a summary: { processed, failed, results }.
     */
    async createBulk(
        dto: BulkScoreDto,
        user: User,
    ): Promise<{ processed: number; failed: number; results: BulkResultEntry[] }> {
        const results: BulkResultEntry[] = [];
        let processed = 0;
        let failed = 0;

        for (let i = 0; i < dto.transactions.length; i++) {
            try {
                const tx = await this.createOne(dto.transactions[i], user);
                results.push({ index: i, transactionId: tx.id, status: 'ok' });
                processed++;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                results.push({ index: i, status: 'error', error: message });
                failed++;
            }
        }

        void this.audit.log('BULK_UPLOAD', user.id, null, null, { count: processed });
        return { processed, failed, results };
    }

    /**
     * Returns a paginated list of transactions.
     * Optionally filtered by status and/or predicted label (from the nested prediction).
     */
    async findAll(
        page: number,
        limit: number,
        status?: string,
        predictedLabel?: string,
        minAmount?: number,
        maxAmount?: number,
        startDate?: string,
        endDate?: string,
        minProbability?: number,
        maxProbability?: number,
    ): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
        const skip = (page - 1) * limit;

        const qb = this.txRepo
            .createQueryBuilder('tx')
            .leftJoinAndSelect('tx.uploadedBy', 'user')
            .leftJoinAndSelect('tx.prediction', 'prediction')
            .orderBy('tx.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (status) qb.andWhere('tx.status = :status', { status });

        if (predictedLabel === 'true') {
            qb.andWhere('prediction.predicted_label = :label', { label: true });
        } else if (predictedLabel === 'false') {
            qb.andWhere('prediction.predicted_label = :label', { label: false });
        }

        if (minAmount !== undefined) qb.andWhere('tx.amount >= :minAmount', { minAmount });
        if (maxAmount !== undefined) qb.andWhere('tx.amount <= :maxAmount', { maxAmount });
        if (startDate) qb.andWhere('tx.occurred_at >= :startDate', { startDate });
        if (endDate) qb.andWhere('tx.occurred_at <= :endDate', { endDate: `${endDate} 23:59:59` });
        if (minProbability !== undefined) qb.andWhere('prediction.fraud_probability >= :minProbability', { minProbability });
        if (maxProbability !== undefined) qb.andWhere('prediction.fraud_probability <= :maxProbability', { maxProbability });

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit };
    }

    async findAllForExport(): Promise<Transaction[]> {
        return this.txRepo
            .createQueryBuilder('tx')
            .leftJoinAndSelect('tx.prediction', 'prediction')
            .leftJoinAndSelect('prediction.review', 'review')
            .leftJoinAndSelect('review.analyst', 'analyst')
            .orderBy('tx.createdAt', 'DESC')
            .getMany();
    }

    /**
     * Returns a single transaction with its nested prediction and review.
     * Throws NotFoundException if the transaction does not exist.
     */
    async findOne(id: number): Promise<Transaction> {
        const tx = await this.txRepo
            .createQueryBuilder('tx')
            .leftJoinAndSelect('tx.uploadedBy', 'user')
            .leftJoinAndSelect('tx.prediction', 'prediction')
            .leftJoinAndSelect('prediction.review', 'review')
            .leftJoinAndSelect('review.analyst', 'analyst')
            .where('tx.id = :id', { id })
            .getOne();

        if (!tx) {
            throw new NotFoundException(`Transaction #${id} not found`);
        }
        return tx;
    }

    /**
     * Returns aggregate counts for the dashboard stats bar.
     */
    async getStats(): Promise<{
        total: number;
        pending: number;
        scored: number;
        confirmed_fraud: number;
        false_positive: number;
    }> {
        const total = await this.txRepo.count();
        const pending = await this.txRepo.count({ where: { status: 'pending' } });
        const scored = await this.txRepo.count({ where: { status: 'scored' } });

        // Count transactions linked to reviews with specific decisions
        const confirmed_fraud = await this.txRepo
            .createQueryBuilder('tx')
            .innerJoin('tx.prediction', 'pred')
            .innerJoin('pred.review', 'rev')
            .where("rev.decision = 'confirmed_fraud'")
            .getCount();

        const false_positive = await this.txRepo
            .createQueryBuilder('tx')
            .innerJoin('tx.prediction', 'pred')
            .innerJoin('pred.review', 'rev')
            .where("rev.decision = 'false_positive'")
            .getCount();

        return { total, pending, scored, confirmed_fraud, false_positive };
    }
}

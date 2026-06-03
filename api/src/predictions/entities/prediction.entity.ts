import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    Relation,
} from 'typeorm';
import { Transaction } from '../../transactions/entities/transaction.entity';
// Forward reference to avoid circular import: Prediction → Review → Prediction
type ReviewRef = { id: number } & Record<string, unknown>;

/**
 * Prediction entity — stores the ML model's output for a transaction.
 *
 * One transaction has exactly one prediction (created immediately after scoring).
 * The back-reference to Review (review property) is needed so the flagged-queue
 * query can LEFT JOIN and filter out already-reviewed predictions.
 */
@Entity({ name: 'predictions' })
export class Prediction {
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * The transaction this prediction belongs to.
     * OneToOne: one transaction → one prediction.
     */
    @OneToOne(() => Transaction, { eager: false })
    @JoinColumn({ name: 'transaction_id' })
    transaction: Transaction;

    /**
     * Probability score from the ML model, range [0, 1].
     * Stored as NUMERIC(5,4) — e.g., 0.9873.
     */
    @Column({ type: 'numeric', precision: 5, scale: 4, name: 'fraud_probability' })
    fraudProbability: number;

    /** True if the model predicted this as fraud (probability > threshold). */
    @Column({ type: 'boolean', name: 'predicted_label' })
    predictedLabel: boolean;

    /** Identifies which model artifact produced this prediction (e.g., "xgboost_v1"). */
    @Column({ type: 'varchar', length: 50, name: 'model_version' })
    modelVersion: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    /**
     * Inverse side of the OneToOne with Review.
     * Used in the flagged-queue query: .leftJoin('p.review', 'r').andWhere('r.id IS NULL')
     * The JoinColumn is on the Review side (prediction_id FK).
     */
    @OneToOne('Review', 'prediction', { nullable: true })
    review: Relation<ReviewRef> | null;
}

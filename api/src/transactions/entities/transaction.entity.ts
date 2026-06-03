import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
// Forward reference to avoid circular import: Transaction → Prediction → Transaction
// TypeORM handles this via string-based relation mapping.
type PredictionRef = { id: number } & Record<string, unknown>;

/** All possible lifecycle states of a transaction. */
export type TransactionStatus = 'pending' | 'scored' | 'reviewed';

/**
 * Transaction entity — represents a single credit card transaction
 * submitted for fraud scoring.
 *
 * Lifecycle:  pending → scored (after ML prediction) → reviewed (after analyst decision)
 */
@Entity({ name: 'transactions' })
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * The user who submitted this transaction.
     * Using eager: false to control when relations are loaded.
     */
    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'uploaded_by' })
    uploadedBy: User;

    /** Transaction amount in EUR. Stored as NUMERIC(12,2) to avoid floating-point drift. */
    @Column({ type: 'numeric', precision: 12, scale: 2 })
    amount: number;

    /** The real-world timestamp when the transaction occurred (UTC). */
    @Column({ type: 'timestamptz', name: 'occurred_at' })
    occurredAt: Date;

    /**
     * Raw PCA feature vector (Time, Amount, V1–V28) as a JSON object.
     * Stored in JSONB for fast indexing and easy retrieval.
     */
    @Column({ type: 'jsonb' })
    features: Record<string, number>;

    /** Current lifecycle status of this transaction. */
    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: TransactionStatus;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    /**
     * Inverse side of the OneToOne relation with Prediction.
     * Allows queries like: tx.prediction, without making it eager.
     * The JoinColumn is on the Prediction side (prediction_id FK).
     */
    @OneToOne('Prediction', 'transaction', { nullable: true })
    prediction: Relation<PredictionRef> | null;
}

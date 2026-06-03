import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    Check,
} from 'typeorm';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { User } from '../../users/entities/user.entity';

/** Possible analyst decisions when reviewing a flagged transaction. */
export type ReviewDecision = 'confirmed_fraud' | 'false_positive' | 'needs_investigation';

/**
 * Review entity — stores an analyst's manual decision on a flagged prediction.
 *
 * Only predictions where predictedLabel = true are eligible for review.
 * Each prediction can have at most one review (enforced by OneToOne + ConflictException in service).
 */
@Check(`"decision" IN ('confirmed_fraud', 'false_positive', 'needs_investigation')`)
@Entity({ name: 'reviews' })
export class Review {
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * The ML prediction being reviewed.
     * OneToOne: one prediction → one review.
     */
    @OneToOne(() => Prediction, { eager: false })
    @JoinColumn({ name: 'prediction_id' })
    prediction: Prediction;

    /**
     * The analyst who submitted this review.
     * ManyToOne: one user can review many predictions.
     */
    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'analyst_id' })
    analyst: User;

    /**
     * The analyst's decision. CHECK constraint ensures only valid values.
     * - confirmed_fraud: the prediction was correct, real fraud
     * - false_positive: the model was wrong, legitimate transaction
     * - needs_investigation: unclear, requires further manual review
     */
    @Column({ type: 'varchar', length: 30 })
    decision: ReviewDecision;

    /** Optional analyst notes — free text, nullable. */
    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn({ name: 'reviewed_at', type: 'timestamptz' })
    reviewedAt: Date;
}

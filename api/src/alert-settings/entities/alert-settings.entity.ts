import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'alert_settings' })
export class AlertSettings {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({
        type: 'numeric',
        precision: 3,
        scale: 2,
        name: 'fraud_threshold',
        default: 0.8,
    })
    fraudThreshold: number;

    @Column({ type: 'boolean', name: 'notifications_enabled', default: true })
    notificationsEnabled: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true, name: 'alert_email' })
    alertEmail: string | null;

    @Column({ type: 'timestamptz', name: 'updated_at', nullable: true })
    updatedAt: Date;
}

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'audit_logs' })
export class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { eager: false, nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ name: 'user_id', nullable: true })
    userId: number | null;

    @Column({ type: 'varchar', length: 50 })
    action: string;

    @Column({ type: 'varchar', length: 50, nullable: true, name: 'entity_type' })
    entityType: string | null;

    @Column({ type: 'int', nullable: true, name: 'entity_id' })
    entityId: number | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
    ipAddress: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}

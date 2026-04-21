import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Roles available in the system.
 * - admin: can manage users
 * - analyst: can review flagged transactions
 * - viewer: read-only access
 */
export type UserRole = 'admin' | 'analyst' | 'viewer';

/**
 * User entity.
 *
 * TypeORM will create a `users` table with these columns
 * when the NestJS app starts (because synchronize=true).
 */
@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255 })
    email: string;

    // Never exposed via the API — @Exclude on serialization layer (later)
    @Column({ type: 'varchar', length: 255, name: 'password_hash' })
    passwordHash: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'analyst',
    })
    role: UserRole;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
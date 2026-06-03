import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

/**
 * Roles available in the system.
 * - admin:   can manage users, approve accounts, access everything
 * - analyst: can score transactions and submit reviews
 * - viewer:  read-only, manager-level visibility (analytics dashboard)
 */
export type UserRole = 'admin' | 'analyst' | 'viewer';

/**
 * Account status — controls whether a user can log in.
 * - pending:  registered but awaiting admin approval (default for non-admins)
 * - active:   approved, can log in normally
 * - rejected: admin rejected the registration, login blocked with explanation
 */
export type UserStatus = 'pending' | 'active' | 'rejected';

/**
 * User entity.
 *
 * TypeORM creates/syncs a `users` table when the NestJS app starts
 * because synchronize=true is set in AppModule.
 *
 * The `status` column defaults to 'active' at DB level so that EXISTING
 * rows are not broken during the migration.  New non-admin users are
 * explicitly set to 'pending' in AuthService.register().
 */
@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255 })
    email: string;

    // Never exposed via the API
    @Column({ type: 'varchar', length: 255, name: 'password_hash' })
    passwordHash: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'analyst',
    })
    role: UserRole;

    /**
     * Account approval status.
     * Defaults to 'active' at DB level → existing rows stay functional.
     * AuthService.register() overrides to 'pending' for non-admin signups.
     */
    @Column({
        type: 'varchar',
        length: 20,
        name: 'status',
        default: 'active',
    })
    status: UserStatus;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
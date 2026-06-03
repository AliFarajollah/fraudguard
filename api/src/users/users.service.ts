import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';

/**
 * UsersService — business logic for user operations.
 */
@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>,
    ) { }

    // ─── Queries ──────────────────────────────────────────────────────────────

    /** Returns all users, ordered by creation date descending. */
    async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
        const users = await this.usersRepo.find({ order: { createdAt: 'DESC' } });
        return users.map(({ passwordHash, ...u }) => u);
    }

    /** Returns all accounts whose status is 'pending'. */
    async findPending(): Promise<Omit<User, 'passwordHash'>[]> {
        const users = await this.usersRepo.find({
            where: { status: 'pending' },
            order: { createdAt: 'ASC' }, // oldest first — review in order of registration
        });
        return users.map(({ passwordHash, ...u }) => u);
    }

    /** Returns the count of pending accounts — used for the nav badge. */
    async countPending(): Promise<number> {
        return this.usersRepo.count({ where: { status: 'pending' } });
    }

    async findById(id: number): Promise<User | null> {
        return this.usersRepo.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepo.findOne({ where: { email } });
    }

    // ─── Mutations ────────────────────────────────────────────────────────────

    /**
     * Updates a user's role (admin only).
     * Validates the role value before persisting.
     */
    async updateRole(id: number, role: string): Promise<Omit<User, 'passwordHash'>> {
        const validRoles: UserRole[] = ['admin', 'analyst', 'viewer'];
        if (!validRoles.includes(role as UserRole)) {
            throw new BadRequestException(`Invalid role '${role}'. Must be one of: ${validRoles.join(', ')}`);
        }

        const user = await this.usersRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User #${id} not found`);

        user.role = role as UserRole;
        await this.usersRepo.save(user);
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }

    /**
     * Updates a user's account status (admin only).
     * - 'active'   → account approved, user can now log in
     * - 'rejected' → account denied, login blocked with explanation
     */
    async updateStatus(id: number, status: string): Promise<Omit<User, 'passwordHash'>> {
        const validStatuses: UserStatus[] = ['pending', 'active', 'rejected'];
        if (!validStatuses.includes(status as UserStatus)) {
            throw new BadRequestException(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
        }

        const user = await this.usersRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User #${id} not found`);

        user.status = status as UserStatus;
        await this.usersRepo.save(user);
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }
}
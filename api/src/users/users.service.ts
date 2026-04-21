import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * UsersService — business logic for user operations.
 *
 * Kept thin for now. Later we add:
 *   - findByEmail (used by auth)
 *   - create (used by register)
 *   - updateRole (admin-only)
 */
@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>,
    ) { }

    async findAll(): Promise<User[]> {
        return this.usersRepo.find();
    }

    async findById(id: number): Promise<User> {
        const user = await this.usersRepo.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with id ${id} not found`);
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepo.findOne({ where: { email } });
    }
}
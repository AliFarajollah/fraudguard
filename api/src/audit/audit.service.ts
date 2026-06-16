import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditPage {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly repo: Repository<AuditLog>,
    ) {}

    async log(
        action: string,
        userId?: number | null,
        entityType?: string | null,
        entityId?: number | null,
        metadata?: Record<string, unknown> | null,
        ipAddress?: string | null,
    ): Promise<void> {
        const entry = this.repo.create({
            action,
            userId: userId ?? null,
            entityType: entityType ?? null,
            entityId: entityId ?? null,
            metadata: metadata ?? null,
            ipAddress: ipAddress ?? null,
        });
        await this.repo.save(entry);
    }

    async findAll(
        page: number,
        limit: number,
        action?: string,
        userId?: number,
        entityType?: string,
    ): Promise<AuditPage> {
        const qb = this.repo.createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .orderBy('log.createdAt', 'DESC');

        if (action) qb.andWhere('log.action = :action', { action });
        if (userId) qb.andWhere('log.userId = :userId', { userId });
        if (entityType) qb.andWhere('log.entityType = :entityType', { entityType });

        const [data, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return { data, total, page, limit };
    }

    async findByUser(userId: number, limit = 10): Promise<AuditLog[]> {
        return this.repo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    async findByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
        return this.repo.find({
            where: { entityType, entityId },
            order: { createdAt: 'DESC' },
            relations: ['user'],
        });
    }
}

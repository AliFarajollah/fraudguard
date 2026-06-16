import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
    let service: AuditService;

    const mockRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                {
                    provide: getRepositoryToken(AuditLog),
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('log()', () => {
        it('should create and save an audit entry', async () => {
            const entry = {
                action: 'USER_LOGIN',
                userId: 1,
                entityType: 'user',
                entityId: 1,
                metadata: null,
                ipAddress: null,
            };
            mockRepo.create.mockReturnValue(entry);
            mockRepo.save.mockResolvedValue(entry);

            await service.log('USER_LOGIN', 1, 'user', 1);

            expect(mockRepo.create).toHaveBeenCalledWith({
                action: 'USER_LOGIN',
                userId: 1,
                entityType: 'user',
                entityId: 1,
                metadata: null,
                ipAddress: null,
            });
            expect(mockRepo.save).toHaveBeenCalledWith(entry);
        });

        it('should handle null optional parameters', async () => {
            const entry = {
                action: 'BULK_UPLOAD',
                userId: null,
                entityType: null,
                entityId: null,
                metadata: null,
                ipAddress: null,
            };
            mockRepo.create.mockReturnValue(entry);
            mockRepo.save.mockResolvedValue(entry);

            await service.log('BULK_UPLOAD');

            expect(mockRepo.create).toHaveBeenCalledWith({
                action: 'BULK_UPLOAD',
                userId: null,
                entityType: null,
                entityId: null,
                metadata: null,
                ipAddress: null,
            });
        });

        it('should store metadata when provided', async () => {
            const meta = { amount: 149.62, fraudProbability: 0.94 };
            const entry = {
                action: 'TRANSACTION_SCORED',
                userId: 2,
                entityType: 'transaction',
                entityId: 42,
                metadata: meta,
                ipAddress: null,
            };
            mockRepo.create.mockReturnValue(entry);
            mockRepo.save.mockResolvedValue(entry);

            await service.log('TRANSACTION_SCORED', 2, 'transaction', 42, meta);

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                metadata: meta,
            }));
        });
    });

    describe('findByUser()', () => {
        it('should return audit entries for a specific user', async () => {
            const entries = [
                { id: 1, action: 'USER_LOGIN', userId: 1, createdAt: new Date() },
                { id: 2, action: 'REVIEW_SUBMITTED', userId: 1, createdAt: new Date() },
            ];
            mockRepo.find.mockResolvedValue(entries);

            const result = await service.findByUser(1, 10);

            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { userId: 1 },
                order: { createdAt: 'DESC' },
                take: 10,
            });
            expect(result).toEqual(entries);
        });
    });

    describe('findByEntity()', () => {
        it('should return audit entries for a specific entity', async () => {
            const entries = [
                { id: 1, action: 'TRANSACTION_SCORED', entityType: 'transaction', entityId: 42 },
            ];
            mockRepo.find.mockResolvedValue(entries);

            const result = await service.findByEntity('transaction', 42);

            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { entityType: 'transaction', entityId: 42 },
                order: { createdAt: 'DESC' },
                relations: ['user'],
            });
            expect(result).toEqual(entries);
        });
    });

    describe('findAll()', () => {
        it('should return paginated audit entries', async () => {
            const mockQb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([
                    [{ id: 1, action: 'USER_LOGIN' }],
                    1,
                ]),
            };
            mockRepo.createQueryBuilder.mockReturnValue(mockQb);

            const result = await service.findAll(1, 20);

            expect(result).toEqual({
                data: [{ id: 1, action: 'USER_LOGIN' }],
                total: 1,
                page: 1,
                limit: 20,
            });
        });

        it('should apply action filter when provided', async () => {
            const mockQb = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            };
            mockRepo.createQueryBuilder.mockReturnValue(mockQb);

            await service.findAll(1, 20, 'USER_LOGIN');

            expect(mockQb.andWhere).toHaveBeenCalledWith(
                'log.action = :action',
                { action: 'USER_LOGIN' },
            );
        });
    });
});

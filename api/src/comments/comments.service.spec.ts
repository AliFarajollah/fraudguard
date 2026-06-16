import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { TransactionComment } from './entities/transaction-comment.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CommentsService', () => {
    let service: CommentsService;

    const mockCommentRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    const mockTxRepo = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CommentsService,
                {
                    provide: getRepositoryToken(TransactionComment),
                    useValue: mockCommentRepo,
                },
                {
                    provide: getRepositoryToken(Transaction),
                    useValue: mockTxRepo,
                },
            ],
        }).compile();

        service = module.get<CommentsService>(CommentsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create()', () => {
        it('should create a comment for an existing transaction', async () => {
            const tx = { id: 1, amount: 100 };
            const user = { id: 1, sub: 1, email: 'test@test.com', role: 'analyst' };
            const comment = {
                id: 1,
                content: 'Suspicious pattern observed',
                transactionId: 1,
                authorId: 1,
                transaction: tx,
                author: user,
            };

            mockTxRepo.findOne.mockResolvedValue(tx);
            mockCommentRepo.create.mockReturnValue(comment);
            mockCommentRepo.save.mockResolvedValue(comment);

            const result = await service.create(1, { content: 'Suspicious pattern observed' }, user as any);

            expect(mockTxRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(mockCommentRepo.create).toHaveBeenCalled();
            expect(mockCommentRepo.save).toHaveBeenCalled();
            expect(result).toEqual(comment);
        });

        it('should throw NotFoundException if transaction does not exist', async () => {
            mockTxRepo.findOne.mockResolvedValue(null);
            const user = { id: 1, sub: 1, email: 'test@test.com', role: 'analyst' };

            await expect(
                service.create(999, { content: 'Test comment' }, user as any),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByTransaction()', () => {
        it('should return comments for a transaction', async () => {
            const comments = [
                { id: 1, content: 'Note 1', createdAt: new Date() },
                { id: 2, content: 'Note 2', createdAt: new Date() },
            ];
            mockCommentRepo.find.mockResolvedValue(comments);

            const result = await service.findByTransaction(1);

            expect(mockCommentRepo.find).toHaveBeenCalledWith({
                where: { transactionId: 1 },
                relations: ['author'],
                order: { createdAt: 'DESC' },
            });
            expect(result).toEqual(comments);
        });
    });

    describe('remove()', () => {
        it('should allow the author to delete their own comment', async () => {
            const comment = { id: 1, authorId: 1, content: 'Test' };
            const user = { id: 1, sub: 1, email: 'test@test.com', role: 'analyst' };
            mockCommentRepo.findOne.mockResolvedValue(comment);
            mockCommentRepo.remove.mockResolvedValue(comment);

            await service.remove(1, user as any);

            expect(mockCommentRepo.remove).toHaveBeenCalledWith(comment);
        });

        it('should allow admin to delete any comment', async () => {
            const comment = { id: 1, authorId: 2, content: 'Test' };
            const admin = { id: 1, sub: 1, email: 'admin@test.com', role: 'admin' };
            mockCommentRepo.findOne.mockResolvedValue(comment);
            mockCommentRepo.remove.mockResolvedValue(comment);

            await service.remove(1, admin as any);

            expect(mockCommentRepo.remove).toHaveBeenCalledWith(comment);
        });

        it('should throw ForbiddenException if non-author non-admin tries to delete', async () => {
            const comment = { id: 1, authorId: 2, content: 'Test' };
            const user = { id: 3, sub: 3, email: 'other@test.com', role: 'analyst' };
            mockCommentRepo.findOne.mockResolvedValue(comment);

            await expect(service.remove(1, user as any)).rejects.toThrow(ForbiddenException);
        });

        it('should throw NotFoundException if comment does not exist', async () => {
            mockCommentRepo.findOne.mockResolvedValue(null);
            const user = { id: 1, sub: 1, email: 'test@test.com', role: 'analyst' };

            await expect(service.remove(999, user as any)).rejects.toThrow(NotFoundException);
        });
    });
});

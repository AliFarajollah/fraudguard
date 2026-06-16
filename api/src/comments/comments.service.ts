import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionComment } from './entities/transaction-comment.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(TransactionComment)
        private readonly commentRepo: Repository<TransactionComment>,

        @InjectRepository(Transaction)
        private readonly txRepo: Repository<Transaction>,
    ) {}

    async create(
        transactionId: number,
        dto: CreateCommentDto,
        author: User,
    ): Promise<TransactionComment> {
        const transaction = await this.txRepo.findOne({ where: { id: transactionId } });
        if (!transaction) {
            throw new NotFoundException(`Transaction #${transactionId} not found`);
        }

        const comment = this.commentRepo.create({
            transaction,
            transactionId,
            author,
            authorId: author.id,
            content: dto.content,
        });

        return this.commentRepo.save(comment);
    }

    async findByTransaction(transactionId: number): Promise<TransactionComment[]> {
        return this.commentRepo.find({
            where: { transactionId },
            order: { createdAt: 'DESC' },
            relations: ['author'],
        });
    }

    async remove(commentId: number, requestingUser: User): Promise<void> {
        const comment = await this.commentRepo.findOne({
            where: { id: commentId },
            relations: ['author'],
        });

        if (!comment) {
            throw new NotFoundException(`Comment #${commentId} not found`);
        }

        const isOwner = comment.authorId === requestingUser.id;
        const isAdmin = requestingUser.role === 'admin';

        if (!isOwner && !isAdmin) {
            throw new ForbiddenException('You can only delete your own comments');
        }

        await this.commentRepo.remove(comment);
    }
}

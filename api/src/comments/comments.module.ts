import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionComment } from './entities/transaction-comment.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
    imports: [TypeOrmModule.forFeature([TransactionComment, Transaction])],
    providers: [CommentsService],
    controllers: [CommentsController],
    exports: [CommentsService],
})
export class CommentsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Transaction } from './entities/transaction.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

/**
 * TransactionsModule — handles creating, scoring, listing, and fetching transactions.
 *
 * Imports:
 * - Transaction entity (for TransactionRepository injection)
 * - Prediction entity (so TransactionsService can save predictions)
 * - HttpModule (for HttpService to call FastAPI)
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Transaction, Prediction]),
        HttpModule,
    ],
    providers: [TransactionsService],
    controllers: [TransactionsController],
    exports: [TypeOrmModule],
})
export class TransactionsModule {}

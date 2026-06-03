import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

/**
 * ReviewsModule — handles submitting and listing analyst review decisions.
 *
 * Imports Prediction + Transaction entities because ReviewsService needs to:
 * - Look up predictions by ID before creating a review
 * - Update the linked transaction's status to 'reviewed' after a review is saved
 */
@Module({
    imports: [TypeOrmModule.forFeature([Review, Prediction, Transaction])],
    providers: [ReviewsService],
    controllers: [ReviewsController],
    exports: [TypeOrmModule],
})
export class ReviewsModule {}

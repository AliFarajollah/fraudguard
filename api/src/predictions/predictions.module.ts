import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prediction } from './entities/prediction.entity';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';

/**
 * PredictionsModule — handles reading and aggregating ML prediction data.
 */
@Module({
    imports: [TypeOrmModule.forFeature([Prediction])],
    providers: [PredictionsService],
    controllers: [PredictionsController],
    exports: [TypeOrmModule, PredictionsService],
})
export class PredictionsModule {}

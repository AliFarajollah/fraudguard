import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertSettings } from './entities/alert-settings.entity';
import { AlertSettingsService } from './alert-settings.service';
import { AlertSettingsController } from './alert-settings.controller';

@Module({
    imports: [TypeOrmModule.forFeature([AlertSettings])],
    providers: [AlertSettingsService],
    controllers: [AlertSettingsController],
    exports: [AlertSettingsService],
})
export class AlertSettingsModule {}

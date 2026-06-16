import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertSettings } from './entities/alert-settings.entity';
import { UpdateAlertSettingsDto } from './dto/update-alert-settings.dto';

const GLOBAL_SETTINGS_USER_ID = 0; // sentinel for platform-wide defaults

@Injectable()
export class AlertSettingsService {
    constructor(
        @InjectRepository(AlertSettings)
        private readonly repo: Repository<AlertSettings>,
    ) {}

    async getForUser(userId: number): Promise<AlertSettings> {
        let settings = await this.repo.findOne({ where: { userId } });
        if (!settings) {
            settings = this.repo.create({ userId, updatedAt: new Date() });
            await this.repo.save(settings);
        }
        return settings;
    }

    async updateForUser(userId: number, dto: UpdateAlertSettingsDto): Promise<AlertSettings> {
        let settings = await this.repo.findOne({ where: { userId } });
        if (!settings) {
            settings = this.repo.create({ userId });
        }

        if (dto.fraudThreshold !== undefined) settings.fraudThreshold = dto.fraudThreshold;
        if (dto.notificationsEnabled !== undefined) settings.notificationsEnabled = dto.notificationsEnabled;
        if (dto.alertEmail !== undefined) settings.alertEmail = dto.alertEmail;
        settings.updatedAt = new Date();

        return this.repo.save(settings);
    }

    async getGlobal(): Promise<AlertSettings> {
        return this.getForUser(GLOBAL_SETTINGS_USER_ID);
    }

    async updateGlobal(dto: UpdateAlertSettingsDto): Promise<AlertSettings> {
        return this.updateForUser(GLOBAL_SETTINGS_USER_ID, dto);
    }
}

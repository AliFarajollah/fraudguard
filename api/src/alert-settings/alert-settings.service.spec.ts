import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertSettingsService } from './alert-settings.service';
import { AlertSettings } from './entities/alert-settings.entity';

describe('AlertSettingsService', () => {
    let service: AlertSettingsService;

    const mockRepo = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AlertSettingsService,
                {
                    provide: getRepositoryToken(AlertSettings),
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<AlertSettingsService>(AlertSettingsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getForUser()', () => {
        it('should return existing settings for a user', async () => {
            const settings = {
                id: 1,
                userId: 1,
                fraudThreshold: 0.8,
                notificationsEnabled: true,
                alertEmail: null,
            };
            mockRepo.findOne.mockResolvedValue(settings);

            const result = await service.getForUser(1);

            expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { userId: 1 } });
            expect(result).toEqual(settings);
        });

        it('should create default settings if none exist for user', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            const defaults = {
                userId: 1,
                fraudThreshold: 0.8,
                notificationsEnabled: true,
                alertEmail: null,
            };
            mockRepo.create.mockReturnValue(defaults);
            mockRepo.save.mockResolvedValue({ id: 1, ...defaults });

            const result = await service.getForUser(1);

            expect(mockRepo.create).toHaveBeenCalled();
            expect(mockRepo.save).toHaveBeenCalled();
            expect(result).toHaveProperty('userId', 1);
        });
    });

    describe('updateForUser()', () => {
        it('should update fraud threshold', async () => {
            const existing = {
                id: 1,
                userId: 1,
                fraudThreshold: 0.8,
                notificationsEnabled: true,
                alertEmail: null,
            };
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((s: AlertSettings) => Promise.resolve(s));

            const result = await service.updateForUser(1, { fraudThreshold: 0.6 });

            expect(result.fraudThreshold).toBe(0.6);
            expect(mockRepo.save).toHaveBeenCalled();
        });

        it('should update notifications enabled flag', async () => {
            const existing = {
                id: 1,
                userId: 1,
                fraudThreshold: 0.8,
                notificationsEnabled: true,
                alertEmail: null,
            };
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((s: AlertSettings) => Promise.resolve(s));

            const result = await service.updateForUser(1, { notificationsEnabled: false });

            expect(result.notificationsEnabled).toBe(false);
        });

        it('should update alert email', async () => {
            const existing = {
                id: 1,
                userId: 1,
                fraudThreshold: 0.8,
                notificationsEnabled: true,
                alertEmail: null,
            };
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((s: AlertSettings) => Promise.resolve(s));

            const result = await service.updateForUser(1, { alertEmail: 'analyst@bank.com' });

            expect(result.alertEmail).toBe('analyst@bank.com');
        });

        it('should create new settings if none exist for user', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            const defaults = {
                userId: 1,
                fraudThreshold: 0.8,
                notificationsEnabled: true,
                alertEmail: null,
            };
            const created = { id: 1, ...defaults, fraudThreshold: 0.9 };
            mockRepo.create.mockReturnValue(defaults);
            mockRepo.save.mockResolvedValue(created);

            const result = await service.updateForUser(1, { fraudThreshold: 0.9 });

            expect(mockRepo.create).toHaveBeenCalled();
        });
    });
});

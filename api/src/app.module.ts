import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PredictionsModule } from './predictions/predictions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuditModule } from './audit/audit.module';
import { CommentsModule } from './comments/comments.module';
import { AlertSettingsModule } from './alert-settings/alert-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    // Applied globally; individual routes can override with @Throttle().
    // Default: 100 requests per 60 seconds per IP (general API protection).
    // Auth endpoints apply stricter limits via @Throttle in auth.controller.ts.
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 60 seconds window (milliseconds)
      limit: 100,   // 100 requests per window per IP
    }]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        logging: true,
      }),
    }),

    UsersModule,
    AuthModule,
    TransactionsModule,
    PredictionsModule,
    ReviewsModule,
    AuditModule,
    CommentsModule,
    AlertSettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
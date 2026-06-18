import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // ────────────────────────────────────────────────────────
  // Swagger / OpenAPI documentation at /api-docs
  // ────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FraudGuard API')
    .setDescription(
      'Backend for the FraudGuard fraud-detection platform. ' +
      'Handles authentication, users, transactions, predictions, and analyst reviews.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from /auth/login or /auth/register',
      },
      'JWT',
    )
    .addTag('auth', 'Registration, login, profile')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // keeps your token across page reloads
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Swagger UI at    http://localhost:${port}/api-docs`);
}
bootstrap();
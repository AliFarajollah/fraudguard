import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable DTO validation globally.
  // - whitelist: strip any field not in the DTO (prevents mass-assignment)
  // - forbidNonWhitelisted: reject requests with unknown fields (stricter)
  // - transform: auto-convert primitives (e.g., string "1" -> number 1)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — allow the React frontend (later) to call us
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}
bootstrap();
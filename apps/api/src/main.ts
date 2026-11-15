import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createValidationPipe } from './common/validation.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.enableCors();
  app.enableShutdownHooks();
  app.useGlobalPipes(createValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hospital de Plantas API')
    .setDescription('API de la app Hospital de Plantas')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  // 0.0.0.0 para que el móvil en tu wifi (y Railway) puedan llegar al API.
  await app.listen(env.PORT, '0.0.0.0');
  console.log(`🌿 API lista en http://localhost:${env.PORT}/v1  ·  docs en /docs`);
}
await bootstrap();

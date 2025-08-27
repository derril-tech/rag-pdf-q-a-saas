// Created automatically by Cursor AI (2025-01-27)

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefix
    app.setGlobalPrefix('v1');

    // Validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // CORS
    app.enableCors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
    });

    // OpenAPI documentation
    const config = new DocumentBuilder()
        .setTitle('RAG PDF Q&A API')
        .setDescription('API for RAG PDF Q&A SaaS platform')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('organizations', 'Organization management')
        .addTag('projects', 'Project management')
        .addTag('documents', 'Document management')
        .addTag('qa', 'Question and Answer operations')
        .addTag('threads', 'Conversation threads')
        .addTag('slack', 'Slack integration')
        .addTag('auth', 'Authentication')
        .addTag('users', 'User management')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`API documentation available at: http://localhost:${port}/api`);
}

bootstrap();

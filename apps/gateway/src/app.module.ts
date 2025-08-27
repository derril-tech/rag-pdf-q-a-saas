// Created automatically by Cursor AI (2025-01-27)

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { QAModule } from './qa/qa.module';
import { ThreadsModule } from './threads/threads.module';
import { SlackModule } from './slack/slack.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ErrorInterceptor } from './common/interceptors/error.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || 'user',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_DATABASE || 'rag_pdf_qa',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: process.env.NODE_ENV === 'development',
            logging: process.env.NODE_ENV === 'development',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        }),
        ThrottlerModule.forRoot([
            {
                ttl: 60,
                limit: 100,
            },
        ]),
        OrganizationsModule,
        ProjectsModule,
        DocumentsModule,
        QAModule,
        ThreadsModule,
        SlackModule,
        AuthModule,
        UsersModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: CustomThrottlerGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ErrorInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: IdempotencyInterceptor,
        },
    ],
})
export class AppModule { }

// Created automatically by Cursor AI (2025-01-27)

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ulid } from 'ulid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        // Generate ULID if not present
        if (!request.headers['x-request-id']) {
            request.headers['x-request-id'] = ulid();
        }

        const requestId = request.headers['x-request-id'] as string;
        const method = request.method;
        const url = request.url;
        const userAgent = request.get('User-Agent') || '';
        const ip = request.ip || request.connection.remoteAddress || 'unknown';

        const startTime = Date.now();

        this.logger.log(
            `[${requestId}] ${method} ${url} - ${ip} - ${userAgent}`,
        );

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    const statusCode = response.statusCode;

                    this.logger.log(
                        `[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms`,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;

                    this.logger.error(
                        `[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms - ${error.message}`,
                        error.stack,
                    );
                },
            }),
        );
    }
}

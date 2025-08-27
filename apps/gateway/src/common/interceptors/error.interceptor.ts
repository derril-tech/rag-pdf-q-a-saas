// Created automatically by Cursor AI (2025-01-27)

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Request } from 'express';

export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    timestamp: string;
    requestId: string;
    errors?: Record<string, string[]>;
}

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const requestId = request.headers['x-request-id'] as string || 'unknown';

        return next.handle().pipe(
            map(data => ({
                data,
                timestamp: new Date().toISOString(),
                requestId,
            })),
            catchError(error => {
                let problemDetails: ProblemDetails;

                if (error instanceof HttpException) {
                    const status = error.getStatus();
                    const response = error.getResponse() as any;

                    problemDetails = {
                        type: this.getErrorType(status),
                        title: this.getErrorTitle(status),
                        status,
                        detail: response?.message || error.message,
                        instance: request.url,
                        timestamp: new Date().toISOString(),
                        requestId,
                        errors: response?.errors,
                    };
                } else {
                    problemDetails = {
                        type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
                        title: 'Internal Server Error',
                        status: HttpStatus.INTERNAL_SERVER_ERROR,
                        detail: 'An unexpected error occurred',
                        instance: request.url,
                        timestamp: new Date().toISOString(),
                        requestId,
                    };
                }

                return throwError(() => new HttpException(problemDetails, problemDetails.status));
            }),
        );
    }

    private getErrorType(status: number): string {
        switch (status) {
            case 400:
                return 'https://tools.ietf.org/html/rfc7231#section-6.5.1';
            case 401:
                return 'https://tools.ietf.org/html/rfc7235#section-3.1';
            case 403:
                return 'https://tools.ietf.org/html/rfc7231#section-6.5.3';
            case 404:
                return 'https://tools.ietf.org/html/rfc7231#section-6.5.4';
            case 409:
                return 'https://tools.ietf.org/html/rfc7231#section-6.5.8';
            case 422:
                return 'https://tools.ietf.org/html/rfc4918#section-11.2';
            case 429:
                return 'https://tools.ietf.org/html/rfc6585#section-4';
            case 500:
                return 'https://tools.ietf.org/html/rfc7231#section-6.6.1';
            default:
                return 'https://tools.ietf.org/html/rfc7231#section-6.6.1';
        }
    }

    private getErrorTitle(status: number): string {
        switch (status) {
            case 400:
                return 'Bad Request';
            case 401:
                return 'Unauthorized';
            case 403:
                return 'Forbidden';
            case 404:
                return 'Not Found';
            case 409:
                return 'Conflict';
            case 422:
                return 'Unprocessable Entity';
            case 429:
                return 'Too Many Requests';
            case 500:
                return 'Internal Server Error';
            default:
                return 'Internal Server Error';
        }
    }
}

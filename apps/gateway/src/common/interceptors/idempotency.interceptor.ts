// Created automatically by Cursor AI (2025-01-27)

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    private readonly idempotencyStore = new Map<string, { response: any; timestamp: number }>();

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const idempotencyKey = request.headers['idempotency-key'] as string;

        // Only apply to POST, PUT, PATCH methods
        if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
            return next.handle();
        }

        if (!idempotencyKey) {
            return next.handle();
        }

        // Validate idempotency key format (should be UUID or similar)
        if (!this.isValidIdempotencyKey(idempotencyKey)) {
            throw new BadRequestException('Invalid idempotency key format');
        }

        // Check if we've seen this key before
        const existing = this.idempotencyStore.get(idempotencyKey);
        if (existing) {
            // Check if the key is still valid (within 24 hours)
            const now = Date.now();
            const keyAge = now - existing.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (keyAge < maxAge) {
                // Return the cached response
                return new Observable(subscriber => {
                    subscriber.next(existing.response);
                    subscriber.complete();
                });
            } else {
                // Remove expired key
                this.idempotencyStore.delete(idempotencyKey);
            }
        }

        // Process the request and cache the response
        return next.handle().pipe(
            tap(response => {
                this.idempotencyStore.set(idempotencyKey, {
                    response,
                    timestamp: Date.now(),
                });

                // Clean up old entries (older than 24 hours)
                this.cleanupOldEntries();
            }),
        );
    }

    private isValidIdempotencyKey(key: string): boolean {
        // UUID v4 format or ULID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const ulidRegex = /^[0-9A-Z]{26}$/;

        return uuidRegex.test(key) || ulidRegex.test(key);
    }

    private cleanupOldEntries(): void {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const [key, value] of this.idempotencyStore.entries()) {
            if (now - value.timestamp > maxAge) {
                this.idempotencyStore.delete(key);
            }
        }
    }
}

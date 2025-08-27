// Created automatically by Cursor AI (2025-01-27)

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
    protected getTracker(req: Record<string, any>): string {
        // Use user ID if authenticated, otherwise use IP
        return req.user?.id || req.ip;
    }

    protected async handleRequest(
        context: ExecutionContext,
        limit: number,
        ttl: number,
    ): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Add rate limit headers
        response.header('X-RateLimit-Limit', limit);
        response.header('X-RateLimit-Remaining', limit - 1);
        response.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + ttl);

        return super.handleRequest(context, limit, ttl);
    }
}

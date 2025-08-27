import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
    imports: [ConfigModule],
    providers: [AuditService, AuditInterceptor],
    exports: [AuditService, AuditInterceptor],
})
export class AuditModule { }

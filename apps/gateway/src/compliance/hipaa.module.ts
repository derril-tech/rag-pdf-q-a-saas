import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HIPAAService } from './hipaa.service';
import { HIPAAController } from './hipaa.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [ConfigModule, AuditModule],
    controllers: [HIPAAController],
    providers: [HIPAAService],
    exports: [HIPAAService],
})
export class HIPAAModule { }

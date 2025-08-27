import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OTELService } from './otel.service';

@Module({
    imports: [ConfigModule],
    providers: [OTELService],
    exports: [OTELService],
})
export class TelemetryModule { }

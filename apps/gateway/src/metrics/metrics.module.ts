import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrometheusService } from './prometheus.service';
import { MetricsController } from './metrics.controller';

@Module({
    imports: [ConfigModule],
    controllers: [MetricsController],
    providers: [PrometheusService],
    exports: [PrometheusService],
})
export class MetricsModule { }

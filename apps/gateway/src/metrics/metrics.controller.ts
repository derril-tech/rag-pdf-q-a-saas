import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrometheusService } from './prometheus.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
    constructor(private readonly prometheusService: PrometheusService) { }

    @Get()
    @ApiOperation({ summary: 'Get Prometheus metrics' })
    @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
    async getMetrics(@Res() res: Response) {
        try {
            const metrics = await this.prometheusService.getMetrics();
            res.set('Content-Type', 'text/plain');
            res.send(metrics);
        } catch (error) {
            res.status(500).send('Error generating metrics');
        }
    }
}

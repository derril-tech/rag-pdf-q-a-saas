// Created automatically by Cursor AI (2025-01-27)

import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    Sse,
    MessageEvent,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { QAService } from './qa.service';
import { QARequestDto, QAResponseDto } from '../dto/qa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('qa')
@Controller('qa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QAController {
    constructor(private readonly qaService: QAService) { }

    @Post()
    @ApiOperation({ summary: 'Ask a question and get an answer with citations' })
    @ApiResponse({
        status: 200,
        description: 'Answer with citations',
        type: QAResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Project or documents not found' })
    async askQuestion(
        @Body() qaRequestDto: QARequestDto,
        @Request() req,
    ): Promise<QAResponseDto> {
        return this.qaService.askQuestion(qaRequestDto, req.user.id);
    }

    @Post('stream')
    @Sse()
    @ApiOperation({ summary: 'Stream question and answer with Server-Sent Events' })
    @ApiResponse({
        status: 200,
        description: 'Stream of answer tokens and citations',
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Project or documents not found' })
    streamQuestion(
        @Body() qaRequestDto: QARequestDto,
        @Request() req,
    ): Observable<MessageEvent> {
        return this.qaService.streamQuestion(qaRequestDto, req.user.id);
    }
}

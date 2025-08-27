// Created automatically by Cursor AI (2025-01-27)

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Thread } from './thread.entity';

export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

@Entity('messages')
@Index(['threadId'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    threadId: string;

    @Column({
        type: 'enum',
        enum: MessageRole,
    })
    role: MessageRole;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'jsonb', default: [] })
    citations: Array<{
        documentId: string;
        pageNumber: number;
        chunkIndex: number;
        content: string;
        score: number;
    }>;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Thread, (thread) => thread.messages, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'threadId' })
    thread: Thread;
}

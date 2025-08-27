// Created automatically by Cursor AI (2025-01-27)

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('chunks')
@Index(['documentId'])
@Unique(['documentId', 'pageNumber', 'chunkIndex'])
export class Chunk {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    documentId: string;

    @Column({ type: 'integer' })
    pageNumber: number;

    @Column({ type: 'integer' })
    chunkIndex: number;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'vector', length: 1536, nullable: true })
    embedding: number[];

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Document, (document) => document.chunks, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'documentId' })
    document: Document;
}

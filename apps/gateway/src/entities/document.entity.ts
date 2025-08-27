// Created automatically by Cursor AI (2025-01-27)

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Chunk } from './chunk.entity';

export enum DocumentStatus {
    UPLOADED = 'uploaded',
    PROCESSING = 'processing',
    INGESTED = 'ingested',
    EMBEDDED = 'embedded',
    FAILED = 'failed',
}

@Entity('documents')
@Index(['projectId'])
@Index(['status'])
export class Document {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    projectId: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text' })
    filePath: string;

    @Column({ type: 'bigint' })
    fileSize: number;

    @Column({ type: 'varchar', length: 100 })
    mimeType: string;

    @Column({ type: 'integer', nullable: true })
    pageCount: number;

    @Column({
        type: 'enum',
        enum: DocumentStatus,
        default: DocumentStatus.UPLOADED,
    })
    status: DocumentStatus;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Project, (project) => project.documents, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'projectId' })
    project: Project;

    @OneToMany(() => Chunk, (chunk) => chunk.document)
    chunks: Chunk[];
}

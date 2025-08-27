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
import { Organization } from './organization.entity';
import { Project } from './project.entity';

@Entity('usage_stats')
@Index(['orgId', 'date'])
@Unique(['orgId', 'projectId', 'date'])
export class UsageStats {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId: string;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    projectId: string;

    @Column({ type: 'date' })
    date: string;

    @Column({ type: 'integer', default: 0 })
    queriesCount: number;

    @Column({ type: 'integer', default: 0 })
    tokensUsed: number;

    @Column({ type: 'integer', default: 0 })
    documentsProcessed: number;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Organization, (organization) => organization.usageStats, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'orgId' })
    organization: Organization;

    @ManyToOne(() => Project, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'projectId' })
    project: Project;
}

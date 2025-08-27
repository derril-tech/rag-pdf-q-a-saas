// Created automatically by Cursor AI (2025-01-27)

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('audit_log')
@Index(['orgId', 'userId'])
@Index(['createdAt'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    orgId: string;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    userId: string;

    @Column({ type: 'varchar', length: 100 })
    action: string;

    @Column({ type: 'varchar', length: 50 })
    resourceType: string;

    @Column({ type: 'uuid', nullable: true })
    resourceId: string;

    @Column({ type: 'jsonb', default: {} })
    details: Record<string, any>;

    @Column({ type: 'inet', nullable: true })
    ipAddress: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;
}

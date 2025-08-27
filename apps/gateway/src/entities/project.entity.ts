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
import { Organization } from './organization.entity';
import { Document } from './document.entity';
import { Thread } from './thread.entity';

@Entity('projects')
@Index(['orgId'])
export class Project {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', default: {} })
    settings: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Organization, (organization) => organization.projects, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'orgId' })
    organization: Organization;

    @OneToMany(() => Document, (document) => document.project)
    documents: Document[];

    @OneToMany(() => Thread, (thread) => thread.project)
    threads: Thread[];
}

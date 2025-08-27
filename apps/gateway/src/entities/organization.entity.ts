// Created automatically by Cursor AI (2025-01-27)

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { Project } from './project.entity';
import { Membership } from './membership.entity';
import { UsageStats } from './usage-stats.entity';

export enum PlanTier {
    FREE = 'free',
    PRO = 'pro',
    ENTERPRISE = 'enterprise',
}

@Entity('orgs')
@Index(['slug'], { unique: true })
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    slug: string;

    @Column({
        type: 'enum',
        enum: PlanTier,
        default: PlanTier.FREE,
    })
    planTier: PlanTier;

    @Column({ type: 'jsonb', default: {} })
    settings: Record<string, any>;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;

    // Relations
    @OneToMany(() => Project, (project) => project.organization)
    projects: Project[];

    @OneToMany(() => Membership, (membership) => membership.organization)
    memberships: Membership[];

    @OneToMany(() => UsageStats, (usageStats) => usageStats.organization)
    usageStats: UsageStats[];
}

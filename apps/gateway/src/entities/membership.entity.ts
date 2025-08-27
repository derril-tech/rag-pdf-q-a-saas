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
import { User } from './user.entity';

@Entity('memberships')
@Index(['orgId', 'userId'])
@Unique(['orgId', 'userId'])
export class Membership {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    orgId: string;

    @Column({ type: 'uuid' })
    @Index()
    userId: string;

    @Column({ type: 'varchar', length: 50, default: 'member' })
    role: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Organization, (organization) => organization.memberships, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'orgId' })
    organization: Organization;

    @ManyToOne(() => User, (user) => user.memberships, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user: User;
}

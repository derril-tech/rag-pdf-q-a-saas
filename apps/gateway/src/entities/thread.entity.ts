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
import { Message } from './message.entity';

@Entity('threads')
@Index(['projectId'])
export class Thread {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    @Index()
    projectId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string;

    @Column({ type: 'uuid', nullable: true })
    createdBy: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Project, (project) => project.threads, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'projectId' })
    project: Project;

    @OneToMany(() => Message, (message) => message.thread)
    messages: Message[];
}

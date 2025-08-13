import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CourseModule } from './course-module.entity';

@Entity('course_lessons')
export class CourseLesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'module_id' })
  moduleId: string;

  @Column({ length: 300 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('text', { nullable: true })
  content?: string;

  @Column({ name: 'video_url', nullable: true })
  videoUrl?: string;

  @Column({ length: 100, nullable: true })
  duration?: string;

  @Column({ default: 'video' })
  type: string;

  @Column({ name: 'order_index' })
  orderIndex: number;

  @Column({ name: 'is_free', default: false })
  isFree: boolean;

  @Column('jsonb', { default: [] })
  resources: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CourseModule, (module) => module.lessons)
  @JoinColumn({ name: 'module_id' })
  module: CourseModule;
}
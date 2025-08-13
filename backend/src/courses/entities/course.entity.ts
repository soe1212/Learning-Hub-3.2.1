import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CourseModule } from './course-module.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column('text')
  description: string;

  @Column({ length: 100 })
  category: string;

  @Column({ length: 50 })
  level: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, name: 'original_price' })
  originalPrice?: number;

  @Column({ length: 100, nullable: true })
  duration?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'video_preview_url', nullable: true })
  videoPreviewUrl?: string;

  @Column('text', { array: true, name: 'what_you_will_learn', nullable: true })
  whatYouWillLearn?: string[];

  @Column('text', { array: true, nullable: true })
  requirements?: string[];

  @Column({ name: 'instructor_id' })
  instructorId: string;

  @Column({ default: 'draft' })
  status: string;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'reviews_count', default: 0 })
  reviewsCount: number;

  @Column({ name: 'students_count', default: 0 })
  studentsCount: number;

  @Column({ default: 'en' })
  language: string;

  @Column('text', { array: true, nullable: true })
  subtitles?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.courses)
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @OneToMany(() => CourseModule, (module) => module.course)
  modules: CourseModule[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => Review, (review) => review.course)
  reviews: Review[];
}
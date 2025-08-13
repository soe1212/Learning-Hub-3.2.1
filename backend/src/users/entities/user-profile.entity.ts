import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'date_of_birth', nullable: true })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ 
    name: 'notification_preferences', 
    type: 'jsonb', 
    default: { email: true, push: true, marketing: false } 
  })
  notificationPreferences: Record<string, boolean>;

  @Column({ name: 'learning_goals', type: 'text', array: true, nullable: true })
  learningGoals?: string[];

  @Column({ name: 'skill_level', default: 'beginner' })
  skillLevel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
export interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'student' | 'instructor' | 'admin';
  enrolledCourses: string[];
  createdAt: Date;
  isVerified: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatar: string;
    bio: string;
    rating: number;
    students: number;
  };
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  duration: string;
  students: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  badge?: string;
  curriculum: CourseModule[];
  whatYouWillLearn: string[];
  requirements: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseModule {
  id: string;
  title: string;
  duration: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  videoUrl?: string;
  content?: string;
  isCompleted?: boolean;
  isFree?: boolean;
}

export interface CartItem {
  courseId: string;
  course: Course;
  addedAt: Date;
}

export interface UserProgress {
  courseId: string;
  completedLessons: string[];
  currentLesson?: string;
  progressPercentage: number;
  lastAccessed: Date;
  notes: Note[];
}

export interface Note {
  id: string;
  lessonId: string;
  content: string;
  timestamp: number;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  courseId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get platform analytics (admin only)
router.get('/platform', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    let dateFilter = "created_at >= NOW() - INTERVAL '30 days'";
    if (timeframe === '7d') dateFilter = "created_at >= NOW() - INTERVAL '7 days'";
    if (timeframe === '90d') dateFilter = "created_at >= NOW() - INTERVAL '90 days'";
    if (timeframe === '1y') dateFilter = "created_at >= NOW() - INTERVAL '1 year'";

    // Get overall statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors,
        (SELECT COUNT(*) FROM courses WHERE status = 'published') as total_courses,
        (SELECT COUNT(*) FROM enrollments WHERE status = 'active') as total_enrollments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue,
        (SELECT COUNT(*) FROM users WHERE ${dateFilter}) as new_users_period,
        (SELECT COUNT(*) FROM enrollments WHERE ${dateFilter}) as new_enrollments_period
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    // Get daily registrations for chart
    const registrationsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as registrations
      FROM users 
      WHERE ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const registrationsResult = await pool.query(registrationsQuery);

    // Get daily enrollments for chart
    const enrollmentsQuery = `
      SELECT 
        DATE(enrolled_at) as date,
        COUNT(*) as enrollments
      FROM enrollments 
      WHERE enrolled_at >= NOW() - INTERVAL '${timeframe.replace('d', ' days').replace('y', ' year')}'
      GROUP BY DATE(enrolled_at)
      ORDER BY date
    `;

    const enrollmentsResult = await pool.query(enrollmentsQuery);

    // Get top courses by enrollment
    const topCoursesQuery = `
      SELECT 
        c.id, c.title, c.price,
        COUNT(e.id) as enrollment_count,
        COALESCE(AVG(r.rating), 0) as average_rating
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE c.status = 'published'
      GROUP BY c.id, c.title, c.price
      ORDER BY enrollment_count DESC
      LIMIT 10
    `;

    const topCoursesResult = await pool.query(topCoursesQuery);

    // Get revenue by month
    const revenueQuery = `
      SELECT 
        DATE_TRUNC('month', completed_at) as month,
        SUM(amount) as revenue
      FROM payments 
      WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '1 year'
      GROUP BY DATE_TRUNC('month', completed_at)
      ORDER BY month
    `;

    const revenueResult = await pool.query(revenueQuery);

    res.json({
      stats: {
        totalStudents: parseInt(stats.total_students),
        totalInstructors: parseInt(stats.total_instructors),
        totalCourses: parseInt(stats.total_courses),
        totalEnrollments: parseInt(stats.total_enrollments),
        totalRevenue: parseFloat(stats.total_revenue),
        newUsersPeriod: parseInt(stats.new_users_period),
        newEnrollmentsPeriod: parseInt(stats.new_enrollments_period)
      },
      charts: {
        dailyRegistrations: registrationsResult.rows,
        dailyEnrollments: enrollmentsResult.rows,
        monthlyRevenue: revenueResult.rows
      },
      topCourses: topCoursesResult.rows.map(course => ({
        ...course,
        enrollmentCount: parseInt(course.enrollment_count),
        averageRating: parseFloat(course.average_rating)
      }))
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

// Get instructor analytics
router.get('/instructor', authenticateToken, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const instructorId = req.user.role === 'admin' ? req.query.instructorId : req.user.id;
    
    if (!instructorId) {
      return res.status(400).json({ error: 'Instructor ID required' });
    }

    // Get instructor's course statistics
    const statsQuery = `
      SELECT 
        COUNT(c.id) as total_courses,
        COUNT(CASE WHEN c.status = 'published' THEN 1 END) as published_courses,
        COUNT(CASE WHEN c.status = 'draft' THEN 1 END) as draft_courses,
        COALESCE(SUM(e.enrollment_count), 0) as total_students,
        COALESCE(AVG(r.avg_rating), 0) as average_rating,
        COALESCE(SUM(p.revenue), 0) as total_revenue
      FROM courses c
      LEFT JOIN (
        SELECT course_id, COUNT(*) as enrollment_count
        FROM enrollments WHERE status = 'active'
        GROUP BY course_id
      ) e ON c.id = e.course_id
      LEFT JOIN (
        SELECT course_id, AVG(rating) as avg_rating
        FROM reviews
        GROUP BY course_id
      ) r ON c.id = r.course_id
      LEFT JOIN (
        SELECT 
          unnest(course_ids) as course_id,
          SUM(amount) as revenue
        FROM payments 
        WHERE status = 'completed'
        GROUP BY course_id
      ) p ON c.id = p.course_id
      WHERE c.instructor_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [instructorId]);
    const stats = statsResult.rows[0];

    // Get course performance
    const coursesQuery = `
      SELECT 
        c.id, c.title, c.price, c.status, c.created_at,
        COUNT(e.id) as enrollment_count,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE c.instructor_id = $1
      GROUP BY c.id, c.title, c.price, c.status, c.created_at
      ORDER BY enrollment_count DESC
    `;

    const coursesResult = await pool.query(coursesQuery, [instructorId]);

    // Get monthly earnings
    const earningsQuery = `
      SELECT 
        DATE_TRUNC('month', p.completed_at) as month,
        SUM(p.amount) as earnings
      FROM payments p
      JOIN courses c ON c.id = ANY(p.course_ids)
      WHERE c.instructor_id = $1 AND p.status = 'completed'
        AND p.completed_at >= NOW() - INTERVAL '1 year'
      GROUP BY DATE_TRUNC('month', p.completed_at)
      ORDER BY month
    `;

    const earningsResult = await pool.query(earningsQuery, [instructorId]);

    res.json({
      stats: {
        totalCourses: parseInt(stats.total_courses),
        publishedCourses: parseInt(stats.published_courses),
        draftCourses: parseInt(stats.draft_courses),
        totalStudents: parseInt(stats.total_students),
        averageRating: parseFloat(stats.average_rating),
        totalRevenue: parseFloat(stats.total_revenue)
      },
      courses: coursesResult.rows.map(course => ({
        ...course,
        enrollmentCount: parseInt(course.enrollment_count),
        averageRating: parseFloat(course.average_rating),
        reviewCount: parseInt(course.review_count)
      })),
      monthlyEarnings: earningsResult.rows
    });
  } catch (error) {
    console.error('Get instructor analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch instructor analytics' });
  }
});

// Get student analytics
router.get('/student', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get student's learning statistics
    const statsQuery = `
      SELECT 
        COUNT(e.id) as enrolled_courses,
        COUNT(CASE WHEN prog.progress_percentage >= 100 THEN 1 END) as completed_courses,
        COUNT(CASE WHEN prog.progress_percentage > 0 AND prog.progress_percentage < 100 THEN 1 END) as in_progress_courses,
        COALESCE(AVG(prog.progress_percentage), 0) as average_progress,
        COALESCE(SUM(prog.total_time_spent), 0) as total_learning_time
      FROM enrollments e
      LEFT JOIN (
        SELECT 
          course_id,
          (COUNT(CASE WHEN completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage,
          SUM(time_spent) as total_time_spent
        FROM user_progress 
        WHERE user_id = $1
        GROUP BY course_id
      ) prog ON e.course_id = prog.course_id
      WHERE e.user_id = $1 AND e.status = 'active'
    `;

    const statsResult = await pool.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];

    // Get learning activity over time
    const activityQuery = `
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as lessons_completed
      FROM user_progress
      WHERE user_id = $1 AND completed = true 
        AND completed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(completed_at)
      ORDER BY date
    `;

    const activityResult = await pool.query(activityQuery, [userId]);

    // Get course progress details
    const progressQuery = `
      SELECT 
        c.id, c.title, c.image_url,
        e.enrolled_at,
        COALESCE(prog.progress_percentage, 0) as progress_percentage,
        COALESCE(prog.total_time_spent, 0) as time_spent,
        prog.last_activity
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN (
        SELECT 
          course_id,
          (COUNT(CASE WHEN completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage,
          SUM(time_spent) as total_time_spent,
          MAX(completed_at) as last_activity
        FROM user_progress 
        WHERE user_id = $1
        GROUP BY course_id
      ) prog ON c.id = prog.course_id
      WHERE e.user_id = $1 AND e.status = 'active'
      ORDER BY prog.last_activity DESC NULLS LAST
    `;

    const progressResult = await pool.query(progressQuery, [userId]);

    res.json({
      stats: {
        enrolledCourses: parseInt(stats.enrolled_courses),
        completedCourses: parseInt(stats.completed_courses),
        inProgressCourses: parseInt(stats.in_progress_courses),
        averageProgress: parseFloat(stats.average_progress),
        totalLearningTime: parseInt(stats.total_learning_time)
      },
      learningActivity: activityResult.rows,
      courseProgress: progressResult.rows.map(course => ({
        ...course,
        progressPercentage: parseFloat(course.progress_percentage),
        timeSpent: parseInt(course.time_spent)
      }))
    });
  } catch (error) {
    console.error('Get student analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch student analytics' });
  }
});

// Get course analytics (instructor/admin only)
router.get('/course/:courseId', authenticateToken, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Check if user owns the course (unless admin)
    if (req.user.role !== 'admin') {
      const ownershipCheck = await pool.query(
        'SELECT id FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get course statistics
    const statsQuery = `
      SELECT 
        c.title, c.price, c.created_at,
        COUNT(e.id) as total_enrollments,
        COUNT(CASE WHEN e.enrollment_type = 'free' THEN 1 END) as free_enrollments,
        COUNT(CASE WHEN e.enrollment_type = 'paid' THEN 1 END) as paid_enrollments,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as total_reviews,
        COALESCE(AVG(prog.progress_percentage), 0) as average_completion,
        COUNT(CASE WHEN prog.progress_percentage >= 100 THEN 1 END) as completed_students
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN reviews r ON c.id = r.course_id
      LEFT JOIN (
        SELECT 
          course_id,
          user_id,
          (COUNT(CASE WHEN completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage
        FROM user_progress 
        GROUP BY course_id, user_id
      ) prog ON c.id = prog.course_id
      WHERE c.id = $1
      GROUP BY c.id, c.title, c.price, c.created_at
    `;

    const statsResult = await pool.query(statsQuery, [courseId]);
    
    if (statsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const stats = statsResult.rows[0];

    // Get enrollment trends
    const enrollmentTrendsQuery = `
      SELECT 
        DATE(enrolled_at) as date,
        COUNT(*) as enrollments
      FROM enrollments
      WHERE course_id = $1 AND enrolled_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(enrolled_at)
      ORDER BY date
    `;

    const trendsResult = await pool.query(enrollmentTrendsQuery, [courseId]);

    // Get lesson completion rates
    const lessonStatsQuery = `
      SELECT 
        cl.id, cl.title,
        COUNT(up.id) as total_attempts,
        COUNT(CASE WHEN up.completed = true THEN 1 END) as completions,
        (COUNT(CASE WHEN up.completed = true THEN 1 END) * 100.0 / NULLIF(COUNT(up.id), 0)) as completion_rate
      FROM course_lessons cl
      LEFT JOIN user_progress up ON cl.id = up.lesson_id
      WHERE cl.course_id = $1
      GROUP BY cl.id, cl.title
      ORDER BY cl.order_index
    `;

    const lessonStatsResult = await pool.query(lessonStatsQuery, [courseId]);

    res.json({
      course: {
        title: stats.title,
        price: parseFloat(stats.price),
        createdAt: stats.created_at
      },
      stats: {
        totalEnrollments: parseInt(stats.total_enrollments),
        freeEnrollments: parseInt(stats.free_enrollments),
        paidEnrollments: parseInt(stats.paid_enrollments),
        averageRating: parseFloat(stats.average_rating),
        totalReviews: parseInt(stats.total_reviews),
        averageCompletion: parseFloat(stats.average_completion),
        completedStudents: parseInt(stats.completed_students)
      },
      enrollmentTrends: trendsResult.rows,
      lessonStats: lessonStatsResult.rows.map(lesson => ({
        ...lesson,
        totalAttempts: parseInt(lesson.total_attempts),
        completions: parseInt(lesson.completions),
        completionRate: parseFloat(lesson.completion_rate) || 0
      }))
    });
  } catch (error) {
    console.error('Get course analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch course analytics' });
  }
});

module.exports = router;
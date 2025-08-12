const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user dashboard data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's enrolled courses with progress
    const enrolledCoursesQuery = `
      SELECT 
        c.id, c.title, c.description, c.image_url, c.duration, c.price,
        u.first_name, u.last_name,
        e.enrolled_at, e.status as enrollment_status,
        COALESCE(prog.progress_percentage, 0) as progress_percentage,
        COALESCE(prog.last_activity, e.enrolled_at) as last_activity
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN (
        SELECT 
          course_id,
          user_id,
          (COUNT(CASE WHEN completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage,
          MAX(completed_at) as last_activity
        FROM user_progress 
        WHERE user_id = $1
        GROUP BY course_id, user_id
      ) prog ON c.id = prog.course_id
      WHERE e.user_id = $1 AND e.status = 'active'
      ORDER BY prog.last_activity DESC NULLS LAST, e.enrolled_at DESC
    `;

    const enrolledCourses = await pool.query(enrolledCoursesQuery, [userId]);

    // Get user's learning statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT e.course_id) as total_enrolled,
        COUNT(DISTINCT CASE WHEN prog.progress_percentage >= 100 THEN e.course_id END) as completed_courses,
        COALESCE(SUM(prog.total_time_spent), 0) as total_learning_time,
        COUNT(DISTINCT cert.id) as certificates_earned
      FROM enrollments e
      LEFT JOIN (
        SELECT 
          course_id,
          user_id,
          (COUNT(CASE WHEN completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage,
          SUM(time_spent) as total_time_spent
        FROM user_progress 
        WHERE user_id = $1
        GROUP BY course_id, user_id
      ) prog ON e.course_id = prog.course_id
      LEFT JOIN certificates cert ON e.course_id = cert.course_id AND cert.user_id = $1
      WHERE e.user_id = $1 AND e.status = 'active'
    `;

    const statsResult = await pool.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];

    // Get recent activity
    const recentActivityQuery = `
      SELECT 
        'lesson_completed' as activity_type,
        c.title as course_title,
        cl.title as lesson_title,
        up.completed_at as activity_date
      FROM user_progress up
      JOIN course_lessons cl ON up.lesson_id = cl.id
      JOIN courses c ON up.course_id = c.id
      WHERE up.user_id = $1 AND up.completed = true
      ORDER BY up.completed_at DESC
      LIMIT 10
    `;

    const recentActivity = await pool.query(recentActivityQuery, [userId]);

    // Get recommended courses (simple recommendation based on enrolled course categories)
    const recommendedCoursesQuery = `
      SELECT DISTINCT
        c.id, c.title, c.description, c.image_url, c.price, c.rating, c.level,
        u.first_name, u.last_name,
        COUNT(e2.id) as enrollment_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e2 ON c.id = e2.course_id AND e2.status = 'active'
      WHERE c.status = 'published' 
        AND c.category IN (
          SELECT DISTINCT c2.category 
          FROM enrollments e1 
          JOIN courses c2 ON e1.course_id = c2.id 
          WHERE e1.user_id = $1
        )
        AND c.id NOT IN (
          SELECT course_id FROM enrollments WHERE user_id = $1
        )
      GROUP BY c.id, u.first_name, u.last_name
      ORDER BY enrollment_count DESC, c.rating DESC
      LIMIT 6
    `;

    const recommendedCourses = await pool.query(recommendedCoursesQuery, [userId]);

    res.json({
      enrolledCourses: enrolledCourses.rows.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        imageUrl: course.image_url,
        duration: course.duration,
        price: parseFloat(course.price),
        instructor: `${course.first_name} ${course.last_name}`,
        enrolledAt: course.enrolled_at,
        progress: Math.round(course.progress_percentage),
        lastActivity: course.last_activity
      })),
      stats: {
        totalEnrolled: parseInt(stats.total_enrolled) || 0,
        completedCourses: parseInt(stats.completed_courses) || 0,
        totalLearningTime: parseInt(stats.total_learning_time) || 0,
        certificatesEarned: parseInt(stats.certificates_earned) || 0
      },
      recentActivity: recentActivity.rows,
      recommendedCourses: recommendedCourses.rows.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        imageUrl: course.image_url,
        price: parseFloat(course.price),
        rating: parseFloat(course.rating) || 0,
        level: course.level,
        instructor: `${course.first_name} ${course.last_name}`,
        enrollmentCount: parseInt(course.enrollment_count) || 0
      }))
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get learning streak
router.get('/streak', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const streakQuery = `
      WITH daily_activity AS (
        SELECT DISTINCT DATE(completed_at) as activity_date
        FROM user_progress
        WHERE user_id = $1 AND completed = true
        ORDER BY activity_date DESC
      ),
      streak_calculation AS (
        SELECT 
          activity_date,
          activity_date - ROW_NUMBER() OVER (ORDER BY activity_date DESC)::integer as streak_group
        FROM daily_activity
      )
      SELECT COUNT(*) as current_streak
      FROM streak_calculation
      WHERE streak_group = (
        SELECT streak_group 
        FROM streak_calculation 
        WHERE activity_date = CURRENT_DATE
        LIMIT 1
      )
    `;

    const streakResult = await pool.query(streakQuery, [userId]);
    const currentStreak = streakResult.rows[0]?.current_streak || 0;

    res.json({ currentStreak: parseInt(currentStreak) });
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({ error: 'Failed to fetch learning streak' });
  }
});

module.exports = router;
const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Enroll in course
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    // Check if already enrolled
    const existingEnrollment = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Check if course exists
    const courseResult = await pool.query(
      'SELECT id, price FROM courses WHERE id = $1 AND status = $2',
      [courseId, 'published']
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // For free courses, enroll directly
    if (course.price === 0) {
      const enrollmentResult = await pool.query(
        `INSERT INTO enrollments (user_id, course_id, enrollment_type, status) 
         VALUES ($1, $2, 'free', 'active') RETURNING *`,
        [userId, courseId]
      );

      return res.status(201).json({
        message: 'Enrolled successfully',
        enrollment: enrollmentResult.rows[0]
      });
    }

    // For paid courses, create pending enrollment
    const enrollmentResult = await pool.query(
      `INSERT INTO enrollments (user_id, course_id, enrollment_type, status) 
       VALUES ($1, $2, 'paid', 'pending') RETURNING *`,
      [userId, courseId]
    );

    res.status(201).json({
      message: 'Enrollment created, payment required',
      enrollment: enrollmentResult.rows[0]
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// Get user enrollments
router.get('/my-courses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT e.*, c.title, c.description, c.image_url, c.duration,
             u.first_name, u.last_name,
             COALESCE(p.progress_percentage, 0) as progress_percentage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN (
        SELECT course_id, 
               (COUNT(CASE WHEN completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage
        FROM user_progress 
        WHERE user_id = $1 
        GROUP BY course_id
      ) p ON c.id = p.course_id
      WHERE e.user_id = $1 AND e.status = 'active'
      ORDER BY e.enrolled_at DESC
    `;

    const result = await pool.query(query, [userId]);

    const enrollments = result.rows.map(row => ({
      id: row.id,
      enrolledAt: row.enrolled_at,
      course: {
        id: row.course_id,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        duration: row.duration,
        instructor: `${row.first_name} ${row.last_name}`,
        progress: Math.round(row.progress_percentage)
      }
    }));

    res.json({ enrollments });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Check enrollment status
router.get('/status/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT status, enrolled_at FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (result.rows.length === 0) {
      return res.json({ enrolled: false });
    }

    res.json({
      enrolled: true,
      status: result.rows[0].status,
      enrolledAt: result.rows[0].enrolled_at
    });
  } catch (error) {
    console.error('Check enrollment error:', error);
    res.status(500).json({ error: 'Failed to check enrollment status' });
  }
});

module.exports = router;
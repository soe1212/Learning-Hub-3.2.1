const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Update lesson progress
router.post('/lesson', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId, completed = true } = req.body;
    const userId = req.user.id;

    // Check if user is enrolled
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [userId, courseId, 'active']
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Update or insert progress
    const progressResult = await pool.query(
      `INSERT INTO user_progress (user_id, course_id, lesson_id, completed, completed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, course_id, lesson_id)
       DO UPDATE SET completed = $4, completed_at = NOW()
       RETURNING *`,
      [userId, courseId, lessonId, completed]
    );

    // Calculate overall course progress
    const progressQuery = `
      SELECT 
        COUNT(*) as total_lessons,
        COUNT(CASE WHEN up.completed = true THEN 1 END) as completed_lessons,
        (COUNT(CASE WHEN up.completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage
      FROM course_lessons cl
      LEFT JOIN user_progress up ON cl.id = up.lesson_id AND up.user_id = $1
      WHERE cl.course_id = $2
    `;

    const progressStats = await pool.query(progressQuery, [userId, courseId]);
    const stats = progressStats.rows[0];

    res.json({
      message: 'Progress updated successfully',
      progress: progressResult.rows[0],
      courseProgress: {
        totalLessons: parseInt(stats.total_lessons),
        completedLessons: parseInt(stats.completed_lessons),
        progressPercentage: Math.round(stats.progress_percentage || 0)
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get course progress
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Get detailed progress
    const progressQuery = `
      SELECT 
        cl.id as lesson_id,
        cl.title as lesson_title,
        cm.title as module_title,
        COALESCE(up.completed, false) as completed,
        up.completed_at
      FROM course_lessons cl
      JOIN course_modules cm ON cl.module_id = cm.id
      LEFT JOIN user_progress up ON cl.id = up.lesson_id AND up.user_id = $1
      WHERE cl.course_id = $2
      ORDER BY cm.order_index, cl.order_index
    `;

    const progressResult = await pool.query(progressQuery, [userId, courseId]);

    // Get overall stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_lessons,
        COUNT(CASE WHEN up.completed = true THEN 1 END) as completed_lessons,
        (COUNT(CASE WHEN up.completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage
      FROM course_lessons cl
      LEFT JOIN user_progress up ON cl.id = up.lesson_id AND up.user_id = $1
      WHERE cl.course_id = $2
    `;

    const statsResult = await pool.query(statsQuery, [userId, courseId]);
    const stats = statsResult.rows[0];

    res.json({
      lessons: progressResult.rows,
      stats: {
        totalLessons: parseInt(stats.total_lessons),
        completedLessons: parseInt(stats.completed_lessons),
        progressPercentage: Math.round(stats.progress_percentage || 0)
      }
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Save lesson notes
router.post('/notes', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId, content, timestamp = 0 } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO lesson_notes (user_id, course_id, lesson_id, content, timestamp)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, courseId, lessonId, content, timestamp]
    );

    res.status(201).json({
      message: 'Note saved successfully',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('Save note error:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// Get lesson notes
router.get('/notes/:courseId/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM lesson_notes 
       WHERE user_id = $1 AND course_id = $2 AND lesson_id = $3
       ORDER BY created_at DESC`,
      [userId, courseId, lessonId]
    );

    res.json({ notes: result.rows });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

module.exports = router;
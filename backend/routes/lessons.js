const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get lesson details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get lesson details
    const lessonQuery = `
      SELECT 
        cl.*,
        cm.title as module_title,
        c.title as course_title,
        c.id as course_id,
        up.completed,
        up.time_spent,
        up.completed_at
      FROM course_lessons cl
      JOIN course_modules cm ON cl.module_id = cm.id
      JOIN courses c ON cm.course_id = c.id
      LEFT JOIN user_progress up ON cl.id = up.lesson_id AND up.user_id = $2
      WHERE cl.id = $1
    `;

    const lessonResult = await pool.query(lessonQuery, [id, userId]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonResult.rows[0];

    // Check if user is enrolled in the course
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [userId, lesson.course_id, 'active']
    );

    if (enrollmentCheck.rows.length === 0 && !lesson.is_free) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Get lesson notes
    const notesQuery = `
      SELECT * FROM lesson_notes 
      WHERE user_id = $1 AND lesson_id = $2
      ORDER BY timestamp ASC
    `;

    const notesResult = await pool.query(notesQuery, [userId, id]);

    res.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        videoUrl: lesson.video_url,
        duration: lesson.duration,
        type: lesson.type,
        orderIndex: lesson.order_index,
        isFree: lesson.is_free,
        module: {
          title: lesson.module_title
        },
        course: {
          id: lesson.course_id,
          title: lesson.course_title
        },
        progress: {
          completed: lesson.completed || false,
          timeSpent: lesson.time_spent || 0,
          completedAt: lesson.completed_at
        }
      },
      notes: notesResult.rows
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Get next/previous lesson
router.get('/:id/navigation', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const navigationQuery = `
      WITH current_lesson AS (
        SELECT cl.*, cm.course_id, cm.order_index as module_order
        FROM course_lessons cl
        JOIN course_modules cm ON cl.module_id = cm.id
        WHERE cl.id = $1
      ),
      all_lessons AS (
        SELECT 
          cl.id, cl.title, cl.order_index as lesson_order,
          cm.order_index as module_order,
          ROW_NUMBER() OVER (ORDER BY cm.order_index, cl.order_index) as global_order
        FROM course_lessons cl
        JOIN course_modules cm ON cl.module_id = cm.id
        JOIN current_lesson curr ON cm.course_id = curr.course_id
      ),
      current_position AS (
        SELECT global_order
        FROM all_lessons
        WHERE id = $1
      )
      SELECT 
        al.id, al.title,
        CASE 
          WHEN al.global_order = cp.global_order - 1 THEN 'previous'
          WHEN al.global_order = cp.global_order + 1 THEN 'next'
        END as position
      FROM all_lessons al, current_position cp
      WHERE al.global_order IN (cp.global_order - 1, cp.global_order + 1)
    `;

    const result = await pool.query(navigationQuery, [id]);

    const navigation = {
      previous: null,
      next: null
    };

    result.rows.forEach(row => {
      if (row.position === 'previous') {
        navigation.previous = { id: row.id, title: row.title };
      } else if (row.position === 'next') {
        navigation.next = { id: row.id, title: row.title };
      }
    });

    res.json(navigation);
  } catch (error) {
    console.error('Get lesson navigation error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson navigation' });
  }
});

// Update lesson progress
router.post('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed = true, timeSpent = 0 } = req.body;
    const userId = req.user.id;

    // Get lesson and course info
    const lessonQuery = `
      SELECT cl.*, cm.course_id
      FROM course_lessons cl
      JOIN course_modules cm ON cl.module_id = cm.id
      WHERE cl.id = $1
    `;

    const lessonResult = await pool.query(lessonQuery, [id]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonResult.rows[0];

    // Check enrollment
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [userId, lesson.course_id, 'active']
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Update progress
    const progressResult = await pool.query(
      `INSERT INTO user_progress (user_id, course_id, lesson_id, completed, time_spent, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, course_id, lesson_id)
       DO UPDATE SET 
         completed = $4,
         time_spent = user_progress.time_spent + $5,
         completed_at = CASE WHEN $4 = true THEN $6 ELSE user_progress.completed_at END,
         updated_at = NOW()
       RETURNING *`,
      [userId, lesson.course_id, id, completed, timeSpent, completed ? new Date() : null]
    );

    // Calculate overall course progress
    const courseProgressQuery = `
      SELECT 
        COUNT(*) as total_lessons,
        COUNT(CASE WHEN up.completed = true THEN 1 END) as completed_lessons,
        (COUNT(CASE WHEN up.completed = true THEN 1 END) * 100.0 / COUNT(*)) as progress_percentage
      FROM course_lessons cl
      JOIN course_modules cm ON cl.module_id = cm.id
      LEFT JOIN user_progress up ON cl.id = up.lesson_id AND up.user_id = $1
      WHERE cm.course_id = $2
    `;

    const courseProgressResult = await pool.query(courseProgressQuery, [userId, lesson.course_id]);
    const courseProgress = courseProgressResult.rows[0];

    res.json({
      message: 'Progress updated successfully',
      progress: progressResult.rows[0],
      courseProgress: {
        totalLessons: parseInt(courseProgress.total_lessons),
        completedLessons: parseInt(courseProgress.completed_lessons),
        progressPercentage: Math.round(courseProgress.progress_percentage || 0)
      }
    });
  } catch (error) {
    console.error('Update lesson progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Add lesson note
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, timestamp = 0 } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Get course ID for the lesson
    const lessonQuery = `
      SELECT cm.course_id
      FROM course_lessons cl
      JOIN course_modules cm ON cl.module_id = cm.id
      WHERE cl.id = $1
    `;

    const lessonResult = await pool.query(lessonQuery, [id]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseId = lessonResult.rows[0].course_id;

    // Check enrollment
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [userId, courseId, 'active']
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Add note
    const result = await pool.query(
      `INSERT INTO lesson_notes (user_id, course_id, lesson_id, content, timestamp)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, courseId, id, content.trim(), timestamp]
    );

    res.status(201).json({
      message: 'Note added successfully',
      note: result.rows[0]
    });
  } catch (error) {
    console.error('Add lesson note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Get lesson notes
router.get('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM lesson_notes 
       WHERE user_id = $1 AND lesson_id = $2
       ORDER BY timestamp ASC, created_at ASC`,
      [userId, id]
    );

    res.json({ notes: result.rows });
  } catch (error) {
    console.error('Get lesson notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Delete lesson note
router.delete('/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM lesson_notes WHERE id = $1 AND user_id = $2 RETURNING *',
      [noteId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete lesson note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
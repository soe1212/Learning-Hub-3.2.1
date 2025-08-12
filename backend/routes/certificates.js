const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user certificates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        cert.*,
        c.title as course_title,
        c.description as course_description,
        c.image_url as course_image,
        u.first_name, u.last_name
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE cert.user_id = $1
      ORDER BY cert.issued_at DESC
    `;

    const result = await pool.query(query, [userId]);

    const certificates = result.rows.map(cert => ({
      id: cert.id,
      certificateNumber: cert.certificate_number,
      issuedAt: cert.issued_at,
      course: {
        id: cert.course_id,
        title: cert.course_title,
        description: cert.course_description,
        imageUrl: cert.course_image,
        instructor: `${cert.first_name} ${cert.last_name}`
      }
    }));

    res.json({ certificates });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// Get certificate by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT 
        cert.*,
        c.title as course_title,
        c.description as course_description,
        c.duration as course_duration,
        u.first_name, u.last_name,
        student.first_name as student_first_name,
        student.last_name as student_last_name
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      JOIN users student ON cert.user_id = student.id
      WHERE cert.id = $1 AND cert.user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = result.rows[0];

    res.json({
      certificate: {
        id: cert.id,
        certificateNumber: cert.certificate_number,
        issuedAt: cert.issued_at,
        student: {
          name: `${cert.student_first_name} ${cert.student_last_name}`
        },
        course: {
          id: cert.course_id,
          title: cert.course_title,
          description: cert.course_description,
          duration: cert.course_duration,
          instructor: `${cert.first_name} ${cert.last_name}`
        }
      }
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

// Generate certificate (internal use - called when course is completed)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;

    // Check if user has completed the course
    const completionQuery = `
      SELECT 
        COUNT(*) as total_lessons,
        COUNT(CASE WHEN up.completed = true THEN 1 END) as completed_lessons
      FROM course_lessons cl
      JOIN course_modules cm ON cl.module_id = cm.id
      LEFT JOIN user_progress up ON cl.id = up.lesson_id AND up.user_id = $1
      WHERE cm.course_id = $2
    `;

    const completionResult = await pool.query(completionQuery, [userId, courseId]);
    const completion = completionResult.rows[0];

    if (parseInt(completion.completed_lessons) < parseInt(completion.total_lessons)) {
      return res.status(400).json({ error: 'Course not completed yet' });
    }

    // Check if certificate already exists
    const existingCert = await pool.query(
      'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existingCert.rows.length > 0) {
      return res.status(400).json({ error: 'Certificate already exists' });
    }

    // Generate certificate number
    const certificateNumber = `LHUB-${Date.now()}-${userId.slice(-4).toUpperCase()}`;

    // Create certificate
    const result = await pool.query(
      `INSERT INTO certificates (user_id, course_id, certificate_number, issued_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [userId, courseId, certificateNumber]
    );

    res.status(201).json({
      message: 'Certificate generated successfully',
      certificate: result.rows[0]
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// Verify certificate (public endpoint)
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const query = `
      SELECT 
        cert.*,
        c.title as course_title,
        c.duration as course_duration,
        u.first_name, u.last_name,
        student.first_name as student_first_name,
        student.last_name as student_last_name
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      JOIN users student ON cert.user_id = student.id
      WHERE cert.certificate_number = $1
    `;

    const result = await pool.query(query, [certificateNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = result.rows[0];

    res.json({
      valid: true,
      certificate: {
        certificateNumber: cert.certificate_number,
        issuedAt: cert.issued_at,
        student: `${cert.student_first_name} ${cert.student_last_name}`,
        course: {
          title: cert.course_title,
          duration: cert.course_duration,
          instructor: `${cert.first_name} ${cert.last_name}`
        }
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
});

module.exports = router;
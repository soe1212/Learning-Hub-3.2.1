const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { category, level, search, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT c.*, u.first_name, u.last_name, i.rating as instructor_rating
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN instructors i ON u.id = i.user_id
      WHERE c.status = 'published'
    `;
    
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND c.category = $${paramCount}`;
      params.push(category);
    }

    if (level) {
      paramCount++;
      query += ` AND c.level = $${paramCount}`;
      params.push(level);
    }

    if (search) {
      paramCount++;
      query += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    const courses = result.rows.map(course => ({
      ...course,
      instructor: {
        name: `${course.first_name} ${course.last_name}`,
        rating: course.instructor_rating || 0
      }
    }));

    res.json({ courses, total: courses.length });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const courseQuery = `
      SELECT c.*, u.first_name, u.last_name, u.email, i.rating as instructor_rating, i.total_students
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN instructors i ON u.id = i.user_id
      WHERE c.id = $1 AND c.status = 'published'
    `;
    
    const courseResult = await pool.query(courseQuery, [id]);
    
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];
    
    // Get course modules and lessons
    const modulesQuery = `
      SELECT cm.*, cl.id as lesson_id, cl.title as lesson_title, cl.duration as lesson_duration, cl.type as lesson_type
      FROM course_modules cm
      LEFT JOIN course_lessons cl ON cm.id = cl.module_id
      WHERE cm.course_id = $1
      ORDER BY cm.order_index, cl.order_index
    `;
    
    const modulesResult = await pool.query(modulesQuery, [id]);
    
    // Structure the curriculum
    const modulesMap = new Map();
    modulesResult.rows.forEach(row => {
      if (!modulesMap.has(row.id)) {
        modulesMap.set(row.id, {
          id: row.id,
          title: row.title,
          duration: row.duration,
          lessons: []
        });
      }
      
      if (row.lesson_id) {
        modulesMap.get(row.id).lessons.push({
          id: row.lesson_id,
          title: row.lesson_title,
          duration: row.lesson_duration,
          type: row.lesson_type
        });
      }
    });

    const courseData = {
      ...course,
      instructor: {
        name: `${course.first_name} ${course.last_name}`,
        email: course.email,
        rating: course.instructor_rating || 0,
        students: course.total_students || 0
      },
      curriculum: Array.from(modulesMap.values())
    };

    res.json(courseData);
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create course (instructor only)
router.post('/', authenticateToken, requireRole(['instructor', 'admin']), [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 10 }),
  body('category').trim().isLength({ min: 1 }),
  body('level').isIn(['beginner', 'intermediate', 'advanced']),
  body('price').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      level,
      price,
      originalPrice,
      duration,
      whatYouWillLearn,
      requirements
    } = req.body;

    const result = await pool.query(
      `INSERT INTO courses (
        title, description, category, level, price, original_price, 
        duration, what_you_will_learn, requirements, instructor_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft') 
      RETURNING *`,
      [
        title, description, category, level, price, originalPrice,
        duration, whatYouWillLearn, requirements, req.user.id
      ]
    );

    res.status(201).json({
      message: 'Course created successfully',
      course: result.rows[0]
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

module.exports = router;
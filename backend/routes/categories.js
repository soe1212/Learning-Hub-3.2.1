const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Get all course categories
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        category,
        COUNT(*) as course_count,
        AVG(rating) as average_rating,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM courses 
      WHERE status = 'published'
      GROUP BY category
      ORDER BY course_count DESC
    `;

    const result = await pool.query(query);

    const categories = result.rows.map(row => ({
      name: row.category,
      courseCount: parseInt(row.course_count),
      averageRating: parseFloat(row.average_rating) || 0,
      priceRange: {
        min: parseFloat(row.min_price) || 0,
        max: parseFloat(row.max_price) || 0
      }
    }));

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get courses by category
router.get('/:category/courses', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20, offset = 0, sortBy = 'popular' } = req.query;

    let orderBy = 'enrollment_count DESC';
    switch (sortBy) {
      case 'newest':
        orderBy = 'c.created_at DESC';
        break;
      case 'price_low':
        orderBy = 'c.price ASC';
        break;
      case 'price_high':
        orderBy = 'c.price DESC';
        break;
      case 'rating':
        orderBy = 'c.rating DESC';
        break;
      default:
        orderBy = 'enrollment_count DESC';
    }

    const query = `
      SELECT 
        c.*,
        u.first_name, u.last_name,
        i.rating as instructor_rating,
        COUNT(e.id) as enrollment_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN instructors i ON u.id = i.user_id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.category = $1 AND c.status = 'published'
      GROUP BY c.id, u.first_name, u.last_name, i.rating
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [category, limit, offset]);

    const courses = result.rows.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      imageUrl: course.image_url,
      price: parseFloat(course.price),
      originalPrice: course.original_price ? parseFloat(course.original_price) : null,
      rating: parseFloat(course.rating) || 0,
      level: course.level,
      duration: course.duration,
      instructor: {
        name: `${course.first_name} ${course.last_name}`,
        rating: parseFloat(course.instructor_rating) || 0
      },
      enrollmentCount: parseInt(course.enrollment_count) || 0,
      createdAt: course.created_at,
      updatedAt: course.updated_at
    }));

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM courses
      WHERE category = $1 AND status = 'published'
    `;
    const countResult = await pool.query(countQuery, [category]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      courses,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get category courses error:', error);
    res.status(500).json({ error: 'Failed to fetch category courses' });
  }
});

// Get category statistics
router.get('/:category/stats', async (req, res) => {
  try {
    const { category } = req.params;

    const statsQuery = `
      SELECT 
        COUNT(c.id) as total_courses,
        COUNT(DISTINCT c.instructor_id) as total_instructors,
        COUNT(e.id) as total_enrollments,
        AVG(c.rating) as average_rating,
        AVG(c.price) as average_price,
        COUNT(CASE WHEN c.level = 'beginner' THEN 1 END) as beginner_courses,
        COUNT(CASE WHEN c.level = 'intermediate' THEN 1 END) as intermediate_courses,
        COUNT(CASE WHEN c.level = 'advanced' THEN 1 END) as advanced_courses
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.category = $1 AND c.status = 'published'
    `;

    const result = await pool.query(statsQuery, [category]);
    const stats = result.rows[0];

    res.json({
      category,
      stats: {
        totalCourses: parseInt(stats.total_courses) || 0,
        totalInstructors: parseInt(stats.total_instructors) || 0,
        totalEnrollments: parseInt(stats.total_enrollments) || 0,
        averageRating: parseFloat(stats.average_rating) || 0,
        averagePrice: parseFloat(stats.average_price) || 0,
        levelDistribution: {
          beginner: parseInt(stats.beginner_courses) || 0,
          intermediate: parseInt(stats.intermediate_courses) || 0,
          advanced: parseInt(stats.advanced_courses) || 0
        }
      }
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ error: 'Failed to fetch category statistics' });
  }
});

module.exports = router;
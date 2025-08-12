const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Search courses
router.get('/courses', async (req, res) => {
  try {
    const { 
      q: query, 
      category, 
      level, 
      minPrice, 
      maxPrice, 
      rating,
      sortBy = 'relevance',
      limit = 20, 
      offset = 0 
    } = req.query;

    let searchQuery = `
      SELECT c.*, 
             u.first_name, u.last_name,
             i.rating as instructor_rating,
             AVG(r.rating) as course_rating,
             COUNT(e.id) as enrollment_count,
             ts_rank(to_tsvector('english', c.title || ' ' || c.description), plainto_tsquery('english', $1)) as rank
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN instructors i ON u.id = i.user_id
      LEFT JOIN reviews r ON c.id = r.course_id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.status = 'published'
    `;

    const params = [];
    let paramCount = 0;

    // Full-text search
    if (query) {
      paramCount++;
      searchQuery += ` AND (to_tsvector('english', c.title || ' ' || c.description) @@ plainto_tsquery('english', $${paramCount}))`;
      params.push(query);
    } else {
      params.push(''); // Placeholder for rank calculation
    }

    // Category filter
    if (category) {
      paramCount++;
      searchQuery += ` AND c.category = $${paramCount}`;
      params.push(category);
    }

    // Level filter
    if (level) {
      paramCount++;
      searchQuery += ` AND c.level = $${paramCount}`;
      params.push(level);
    }

    // Price range filter
    if (minPrice) {
      paramCount++;
      searchQuery += ` AND c.price >= $${paramCount}`;
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      paramCount++;
      searchQuery += ` AND c.price <= $${paramCount}`;
      params.push(parseFloat(maxPrice));
    }

    searchQuery += ` GROUP BY c.id, u.first_name, u.last_name, i.rating`;

    // Rating filter (after GROUP BY)
    if (rating) {
      searchQuery += ` HAVING AVG(r.rating) >= ${parseFloat(rating)}`;
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        searchQuery += ` ORDER BY c.price ASC`;
        break;
      case 'price_high':
        searchQuery += ` ORDER BY c.price DESC`;
        break;
      case 'rating':
        searchQuery += ` ORDER BY course_rating DESC NULLS LAST`;
        break;
      case 'popular':
        searchQuery += ` ORDER BY enrollment_count DESC`;
        break;
      case 'newest':
        searchQuery += ` ORDER BY c.created_at DESC`;
        break;
      default: // relevance
        searchQuery += query ? ` ORDER BY rank DESC` : ` ORDER BY c.created_at DESC`;
    }

    searchQuery += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(searchQuery, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN reviews r ON c.id = r.course_id
      WHERE c.status = 'published'
    `;

    const countParams = [];
    let countParamCount = 0;

    if (query) {
      countParamCount++;
      countQuery += ` AND (to_tsvector('english', c.title || ' ' || c.description) @@ plainto_tsquery('english', $${countParamCount}))`;
      countParams.push(query);
    }

    if (category) {
      countParamCount++;
      countQuery += ` AND c.category = $${countParamCount}`;
      countParams.push(category);
    }

    if (level) {
      countParamCount++;
      countQuery += ` AND c.level = $${countParamCount}`;
      countParams.push(level);
    }

    if (minPrice) {
      countParamCount++;
      countQuery += ` AND c.price >= $${countParamCount}`;
      countParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      countParamCount++;
      countQuery += ` AND c.price <= $${countParamCount}`;
      countParams.push(parseFloat(maxPrice));
    }

    const countResult = await pool.query(countQuery, countParams);

    const courses = result.rows.map(course => ({
      ...course,
      instructor: {
        name: `${course.first_name} ${course.last_name}`,
        rating: course.instructor_rating || 0
      },
      rating: course.course_rating ? parseFloat(course.course_rating) : 0,
      students: course.enrollment_count || 0
    }));

    res.json({
      courses,
      total: parseInt(countResult.rows[0].total),
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });
  } catch (error) {
    console.error('Search courses error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestionsQuery = `
      (SELECT 'course' as type, title as suggestion, category, NULL as instructor
       FROM courses 
       WHERE title ILIKE $1 AND status = 'published'
       LIMIT 5)
      UNION ALL
      (SELECT 'instructor' as type, first_name || ' ' || last_name as suggestion, NULL as category, first_name || ' ' || last_name as instructor
       FROM users u
       JOIN instructors i ON u.id = i.user_id
       WHERE (first_name || ' ' || last_name) ILIKE $1
       LIMIT 3)
      UNION ALL
      (SELECT 'category' as type, category as suggestion, category, NULL as instructor
       FROM courses
       WHERE category ILIKE $1 AND status = 'published'
       GROUP BY category
       LIMIT 3)
    `;

    const result = await pool.query(suggestionsQuery, [`%${query}%`]);

    res.json({ suggestions: result.rows });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Get popular searches
router.get('/popular', async (req, res) => {
  try {
    const popularQuery = `
      SELECT category, COUNT(*) as search_count
      FROM courses
      WHERE status = 'published'
      GROUP BY category
      ORDER BY search_count DESC
      LIMIT 10
    `;

    const result = await pool.query(popularQuery);

    res.json({ popular: result.rows });
  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({ error: 'Failed to fetch popular searches' });
  }
});

module.exports = router;
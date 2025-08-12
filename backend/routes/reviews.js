const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get course reviews
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { limit = 10, offset = 0, sortBy = 'newest' } = req.query;

    let orderBy = 'r.created_at DESC';
    if (sortBy === 'rating_high') orderBy = 'r.rating DESC';
    if (sortBy === 'rating_low') orderBy = 'r.rating ASC';
    if (sortBy === 'helpful') orderBy = 'r.helpful_count DESC';

    const reviewsQuery = `
      SELECT r.*, u.first_name, u.last_name, up.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE r.course_id = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const reviewsResult = await pool.query(reviewsQuery, [courseId, limit, offset]);

    // Get review statistics
    const statsQuery = `
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE course_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [courseId]);

    const reviews = reviewsResult.rows.map(review => ({
      ...review,
      user: {
        name: `${review.first_name} ${review.last_name}`,
        avatar: review.avatar_url
      }
    }));

    res.json({
      reviews,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create review
router.post('/', authenticateToken, [
  body('courseId').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').trim().isLength({ min: 10, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, rating, comment } = req.body;
    const userId = req.user.id;

    // Check if user is enrolled in the course
    const enrollmentCheck = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND status = $3',
      [userId, courseId, 'active']
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You must be enrolled in the course to leave a review' });
    }

    // Check if user already reviewed this course
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this course' });
    }

    // Create review
    const result = await pool.query(
      `INSERT INTO reviews (user_id, course_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, courseId, rating, comment]
    );

    // Update course average rating
    await pool.query(
      `UPDATE courses 
       SET rating = (
         SELECT AVG(rating) FROM reviews WHERE course_id = $1
       ),
       reviews_count = (
         SELECT COUNT(*) FROM reviews WHERE course_id = $1
       )
       WHERE id = $1`,
      [courseId]
    );

    res.status(201).json({
      message: 'Review created successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
router.put('/:id', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').trim().isLength({ min: 10, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE reviews 
       SET rating = $1, comment = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [rating, comment, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update course average rating
    const courseId = result.rows[0].course_id;
    await pool.query(
      `UPDATE courses 
       SET rating = (
         SELECT AVG(rating) FROM reviews WHERE course_id = $1
       )
       WHERE id = $1`,
      [courseId]
    );

    res.json({
      message: 'Review updated successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Mark review as helpful
router.post('/:id/helpful', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user already marked this review as helpful
    const existingHelpful = await pool.query(
      'SELECT id FROM review_helpful WHERE review_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingHelpful.rows.length > 0) {
      return res.status(400).json({ error: 'Already marked as helpful' });
    }

    // Add helpful mark
    await pool.query(
      'INSERT INTO review_helpful (review_id, user_id) VALUES ($1, $2)',
      [id, userId]
    );

    // Update helpful count
    await pool.query(
      `UPDATE reviews 
       SET helpful_count = (
         SELECT COUNT(*) FROM review_helpful WHERE review_id = $1
       )
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Review marked as helpful' });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
});

module.exports = router;
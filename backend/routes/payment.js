const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create payment intent
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { courseIds } = req.body;
    const userId = req.user.id;

    if (!courseIds || courseIds.length === 0) {
      return res.status(400).json({ error: 'No courses selected' });
    }

    // Get course details and calculate total
    const coursesQuery = `
      SELECT id, title, price 
      FROM courses 
      WHERE id = ANY($1) AND status = 'published'
    `;
    
    const coursesResult = await pool.query(coursesQuery, [courseIds]);
    const courses = coursesResult.rows;

    if (courses.length !== courseIds.length) {
      return res.status(400).json({ error: 'Some courses not found' });
    }

    const totalAmount = courses.reduce((sum, course) => sum + parseFloat(course.price), 0);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: userId,
        courseIds: courseIds.join(',')
      }
    });

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (user_id, amount, currency, stripe_payment_intent_id, status, course_ids)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, totalAmount, 'usd', paymentIntent.id, 'pending', courseIds]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentResult.rows[0].id,
      amount: totalAmount,
      courses: courses
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment
router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Update payment status
    const paymentResult = await pool.query(
      `UPDATE payments 
       SET status = 'completed', completed_at = NOW()
       WHERE stripe_payment_intent_id = $1 AND user_id = $2
       RETURNING *`,
      [paymentIntentId, userId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = paymentResult.rows[0];

    // Enroll user in courses
    const courseIds = payment.course_ids;
    const enrollmentPromises = courseIds.map(courseId =>
      pool.query(
        `INSERT INTO enrollments (user_id, course_id, enrollment_type, status, payment_id)
         VALUES ($1, $2, 'paid', 'active', $3)
         ON CONFLICT (user_id, course_id) 
         DO UPDATE SET status = 'active', payment_id = $3`,
        [userId, courseId, payment.id]
      )
    );

    await Promise.all(enrollmentPromises);

    res.json({
      message: 'Payment confirmed and enrollment completed',
      payment: payment
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT p.*, 
             array_agg(c.title) as course_titles
      FROM payments p
      LEFT JOIN courses c ON c.id = ANY(p.course_ids)
      WHERE p.user_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
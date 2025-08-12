const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_verified, u.created_at,
             up.phone, up.date_of_birth, up.country, up.timezone, up.language, 
             up.notification_preferences, up.learning_goals, up.skill_level,
             i.title, i.company, i.website_url, i.linkedin_url, i.twitter_url, 
             i.years_experience, i.specializations, i.rating as instructor_rating,
             i.total_students, i.total_courses
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN instructors i ON u.id = i.user_id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        profile: {
          phone: user.phone,
          dateOfBirth: user.date_of_birth,
          country: user.country,
          timezone: user.timezone,
          language: user.language,
          notificationPreferences: user.notification_preferences,
          learningGoals: user.learning_goals,
          skillLevel: user.skill_level
        },
        instructor: user.role === 'instructor' ? {
          title: user.title,
          company: user.company,
          websiteUrl: user.website_url,
          linkedinUrl: user.linkedin_url,
          twitterUrl: user.twitter_url,
          yearsExperience: user.years_experience,
          specializations: user.specializations,
          rating: user.instructor_rating,
          totalStudents: user.total_students,
          totalCourses: user.total_courses
        } : null
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone(),
  body('country').optional().trim().isLength({ min: 1 }),
  body('timezone').optional().trim().isLength({ min: 1 }),
  body('language').optional().isIn(['en', 'es', 'fr', 'de', 'zh', 'ja']),
  body('skillLevel').optional().isIn(['beginner', 'intermediate', 'advanced'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      country,
      timezone,
      language,
      notificationPreferences,
      learningGoals,
      skillLevel
    } = req.body;

    // Update users table
    if (firstName || lastName) {
      await pool.query(
        'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name) WHERE id = $3',
        [firstName, lastName, userId]
      );
    }

    // Update user_profiles table
    const profileResult = await pool.query(
      `INSERT INTO user_profiles (user_id, phone, date_of_birth, country, timezone, language, notification_preferences, learning_goals, skill_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id)
       DO UPDATE SET
         phone = COALESCE($2, user_profiles.phone),
         date_of_birth = COALESCE($3, user_profiles.date_of_birth),
         country = COALESCE($4, user_profiles.country),
         timezone = COALESCE($5, user_profiles.timezone),
         language = COALESCE($6, user_profiles.language),
         notification_preferences = COALESCE($7, user_profiles.notification_preferences),
         learning_goals = COALESCE($8, user_profiles.learning_goals),
         skill_level = COALESCE($9, user_profiles.skill_level),
         updated_at = NOW()
       RETURNING *`,
      [userId, phone, dateOfBirth, country, timezone, language, notificationPreferences, learningGoals, skillLevel]
    );

    res.json({
      message: 'Profile updated successfully',
      profile: profileResult.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 50, offset = 0, role, search } = req.query;

    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_verified, u.is_active, u.created_at, u.last_login,
             COUNT(e.id) as total_enrollments
      FROM users u
      LEFT JOIN enrollments e ON u.id = e.user_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    if (search) {
      paramCount++;
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      isVerified: user.is_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      totalEnrollments: parseInt(user.total_enrollments)
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user status (admin only)
router.patch('/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, first_name, last_name, is_active',
      [isActive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
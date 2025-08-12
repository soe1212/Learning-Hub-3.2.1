-- Seed data for development and testing

-- Insert sample users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified) VALUES
(
    uuid_generate_v4(),
    'admin@learnhub.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: admin123
    'Admin',
    'User',
    'admin',
    true
),
(
    uuid_generate_v4(),
    'instructor@learnhub.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: instructor123
    'Sarah',
    'Chen',
    'instructor',
    true
),
(
    uuid_generate_v4(),
    'student@learnhub.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: student123
    'John',
    'Doe',
    'student',
    true
),
(
    uuid_generate_v4(),
    'demo@learnhub.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- password: demo123
    'Demo',
    'User',
    'student',
    true
);

-- Insert user profiles for the sample users
INSERT INTO user_profiles (user_id, country, timezone, learning_goals, skill_level)
SELECT 
    u.id,
    CASE 
        WHEN u.email = 'admin@learnhub.com' THEN 'United States'
        WHEN u.email = 'instructor@learnhub.com' THEN 'Canada'
        WHEN u.email = 'student@learnhub.com' THEN 'United Kingdom'
        ELSE 'United States'
    END,
    CASE 
        WHEN u.email = 'admin@learnhub.com' THEN 'America/New_York'
        WHEN u.email = 'instructor@learnhub.com' THEN 'America/Toronto'
        WHEN u.email = 'student@learnhub.com' THEN 'Europe/London'
        ELSE 'America/New_York'
    END,
    CASE 
        WHEN u.role = 'student' THEN ARRAY['Learn web development', 'Get certified', 'Career change']
        ELSE ARRAY['Share knowledge', 'Help students succeed']
    END,
    CASE 
        WHEN u.email = 'student@learnhub.com' THEN 'beginner'
        WHEN u.email = 'demo@learnhub.com' THEN 'beginner'
        ELSE 'advanced'
    END
FROM users u;

-- Insert instructor data for instructor users
INSERT INTO instructors (user_id, title, company, specializations, is_approved, rating, total_students)
SELECT 
    u.id,
    'Senior Software Engineer',
    'Google',
    ARRAY['Web Development', 'JavaScript', 'React', 'Node.js'],
    true,
    4.9,
    15000
FROM users u 
WHERE u.role = 'instructor';

-- Clean up expired sessions (this would typically be run by a cron job)
DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM email_verification_tokens WHERE expires_at < CURRENT_TIMESTAMP;
/*
  # Sample Course Data
  
  1. Sample Courses
    - Web Development course
    - Machine Learning course
    - UX Design course
    
  2. Course Modules and Lessons
    - Create structured curriculum
    - Add sample lessons with different types
    
  3. Sample Reviews
    - Add realistic course reviews
*/

-- Insert sample courses (using instructor from previous seed)
INSERT INTO courses (
    id, title, description, category, level, price, original_price, 
    duration, image_url, what_you_will_learn, requirements, instructor_id, status, rating, reviews_count
) 
SELECT 
    uuid_generate_v4(),
    'Complete Web Development Bootcamp',
    'Learn web development from scratch with HTML, CSS, JavaScript, React, Node.js, and more. Build real-world projects and become a full-stack developer.',
    'Development',
    'beginner',
    89.99,
    199.99,
    '65 hours',
    'https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg',
    ARRAY[
        'Build responsive websites with HTML and CSS',
        'Create interactive web applications with JavaScript',
        'Master React for frontend development',
        'Develop backend APIs with Node.js and Express',
        'Work with databases using MongoDB',
        'Deploy applications to the cloud'
    ],
    ARRAY[
        'No programming experience needed',
        'A computer with internet connection',
        'Willingness to learn and practice'
    ],
    u.id,
    'published',
    4.8,
    1247
FROM users u WHERE u.role = 'instructor' LIMIT 1;

INSERT INTO courses (
    id, title, description, category, level, price, original_price, 
    duration, image_url, what_you_will_learn, requirements, instructor_id, status, rating, reviews_count
) 
SELECT 
    uuid_generate_v4(),
    'Machine Learning with Python',
    'Master machine learning algorithms and build real-world projects. Learn supervised and unsupervised learning, neural networks, and deep learning.',
    'Data Science',
    'intermediate',
    79.99,
    179.99,
    '44 hours',
    'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg',
    ARRAY[
        'Understand machine learning fundamentals',
        'Implement algorithms from scratch',
        'Use scikit-learn and TensorFlow',
        'Build and deploy ML models',
        'Work with real datasets',
        'Create predictive models'
    ],
    ARRAY[
        'Basic Python programming knowledge',
        'High school level mathematics',
        'Familiarity with statistics (helpful but not required)'
    ],
    u.id,
    'published',
    4.7,
    892
FROM users u WHERE u.role = 'instructor' LIMIT 1;

INSERT INTO courses (
    id, title, description, category, level, price, original_price, 
    duration, image_url, what_you_will_learn, requirements, instructor_id, status, rating, reviews_count
) 
SELECT 
    uuid_generate_v4(),
    'UX/UI Design Masterclass',
    'Learn user experience and user interface design from scratch. Master design thinking, prototyping, and create stunning user interfaces.',
    'Design',
    'beginner',
    0.00,
    NULL,
    '32 hours',
    'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg',
    ARRAY[
        'Understand UX design principles',
        'Create user personas and journey maps',
        'Design wireframes and prototypes',
        'Master Figma and design tools',
        'Conduct user research',
        'Build a professional portfolio'
    ],
    ARRAY[
        'No design experience needed',
        'Access to Figma (free)',
        'Creative mindset'
    ],
    u.id,
    'published',
    4.9,
    567
FROM users u WHERE u.role = 'instructor' LIMIT 1;

-- Create course modules for Web Development course
WITH web_course AS (
    SELECT id FROM courses WHERE title = 'Complete Web Development Bootcamp' LIMIT 1
)
INSERT INTO course_modules (course_id, title, description, duration, order_index)
SELECT 
    wc.id,
    module_data.title,
    module_data.description,
    module_data.duration,
    module_data.order_index
FROM web_course wc,
(VALUES 
    ('Introduction to Web Development', 'Get started with web development fundamentals', '3 hours', 1),
    ('HTML Fundamentals', 'Learn the structure of web pages with HTML', '8 hours', 2),
    ('CSS Styling', 'Style your web pages with CSS', '10 hours', 3),
    ('JavaScript Basics', 'Add interactivity with JavaScript', '12 hours', 4),
    ('React Framework', 'Build modern web apps with React', '15 hours', 5),
    ('Backend Development', 'Create APIs with Node.js and Express', '12 hours', 6),
    ('Database Integration', 'Work with databases and data persistence', '8 hours', 7),
    ('Deployment & DevOps', 'Deploy your applications to the cloud', '5 hours', 8)
) AS module_data(title, description, duration, order_index);

-- Create lessons for the first few modules
WITH web_modules AS (
    SELECT cm.id, cm.title, cm.order_index
    FROM course_modules cm
    JOIN courses c ON cm.course_id = c.id
    WHERE c.title = 'Complete Web Development Bootcamp'
    AND cm.order_index <= 3
)
INSERT INTO course_lessons (module_id, title, description, duration, type, order_index, is_free)
SELECT 
    wm.id,
    lesson_data.title,
    lesson_data.description,
    lesson_data.duration,
    lesson_data.type,
    lesson_data.order_index,
    lesson_data.is_free
FROM web_modules wm,
(VALUES 
    -- Introduction module lessons
    (1, 'What is Web Development?', 'Overview of web development and career paths', '15 min', 'video', 1, true),
    (1, 'Setting Up Your Development Environment', 'Install and configure development tools', '25 min', 'video', 2, true),
    (1, 'Your First Web Page', 'Create your very first HTML page', '20 min', 'video', 3, false),
    
    -- HTML Fundamentals lessons
    (2, 'HTML Document Structure', 'Understanding HTML document anatomy', '30 min', 'video', 1, false),
    (2, 'HTML Elements and Tags', 'Learn about different HTML elements', '35 min', 'video', 2, false),
    (2, 'Forms and Input Elements', 'Create interactive forms', '40 min', 'video', 3, false),
    (2, 'HTML Semantic Elements', 'Use semantic HTML for better structure', '25 min', 'video', 4, false),
    (2, 'HTML Quiz', 'Test your HTML knowledge', '15 min', 'quiz', 5, false),
    
    -- CSS Styling lessons
    (3, 'CSS Basics and Selectors', 'Introduction to CSS and selectors', '30 min', 'video', 1, false),
    (3, 'CSS Box Model', 'Understanding the CSS box model', '35 min', 'video', 2, false),
    (3, 'CSS Flexbox', 'Master flexible layouts with Flexbox', '45 min', 'video', 3, false),
    (3, 'CSS Grid', 'Create complex layouts with CSS Grid', '50 min', 'video', 4, false),
    (3, 'Responsive Design', 'Make your websites mobile-friendly', '40 min', 'video', 5, false),
    (3, 'CSS Animations', 'Add smooth animations to your pages', '30 min', 'video', 6, false)
) AS lesson_data(module_order, title, description, duration, type, order_index, is_free)
WHERE wm.order_index = lesson_data.module_order;

-- Create modules for Machine Learning course
WITH ml_course AS (
    SELECT id FROM courses WHERE title = 'Machine Learning with Python' LIMIT 1
)
INSERT INTO course_modules (course_id, title, description, duration, order_index)
SELECT 
    mc.id,
    module_data.title,
    module_data.description,
    module_data.duration,
    module_data.order_index
FROM ml_course mc,
(VALUES 
    ('Introduction to Machine Learning', 'Fundamentals and overview of ML', '4 hours', 1),
    ('Data Preprocessing', 'Clean and prepare data for ML models', '6 hours', 2),
    ('Supervised Learning', 'Classification and regression algorithms', '12 hours', 3),
    ('Unsupervised Learning', 'Clustering and dimensionality reduction', '8 hours', 4),
    ('Neural Networks', 'Deep learning fundamentals', '10 hours', 5),
    ('Model Evaluation', 'Assess and improve model performance', '4 hours', 6)
) AS module_data(title, description, duration, order_index);

-- Create modules for UX/UI Design course
WITH design_course AS (
    SELECT id FROM courses WHERE title = 'UX/UI Design Masterclass' LIMIT 1
)
INSERT INTO course_modules (course_id, title, description, duration, order_index)
SELECT 
    dc.id,
    module_data.title,
    module_data.description,
    module_data.duration,
    module_data.order_index
FROM design_course dc,
(VALUES 
    ('Design Thinking Fundamentals', 'Introduction to design thinking process', '5 hours', 1),
    ('User Research Methods', 'Learn to understand your users', '6 hours', 2),
    ('Wireframing and Prototyping', 'Create low and high-fidelity prototypes', '8 hours', 3),
    ('Visual Design Principles', 'Color, typography, and layout', '7 hours', 4),
    ('Figma Mastery', 'Master the Figma design tool', '6 hours', 5)
) AS module_data(title, description, duration, order_index);

-- Add some sample reviews
WITH course_ids AS (
    SELECT id, title FROM courses WHERE status = 'published'
),
student_id AS (
    SELECT id FROM users WHERE role = 'student' LIMIT 1
)
INSERT INTO reviews (user_id, course_id, rating, comment)
SELECT 
    s.id,
    c.id,
    review_data.rating,
    review_data.comment
FROM student_id s, course_ids c,
(VALUES 
    (5, 'Absolutely fantastic course! The instructor explains everything clearly and the projects are very practical. I went from knowing nothing about web development to building my own websites.'),
    (4, 'Great content and well-structured curriculum. The machine learning concepts are explained in an easy-to-understand way. Would definitely recommend to anyone starting in ML.'),
    (5, 'This free UX course is better than many paid courses I''ve taken. The design thinking approach really changed how I approach problems. Thank you!')
) AS review_data(rating, comment);

-- Update course ratings and review counts based on actual reviews
UPDATE courses SET 
    rating = (SELECT AVG(rating) FROM reviews WHERE course_id = courses.id),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE course_id = courses.id)
WHERE id IN (SELECT DISTINCT course_id FROM reviews);
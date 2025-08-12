const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Check if data already exists
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('📊 Database already contains data, skipping seed');
      return;
    }

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const users = [
      {
        email: 'admin@learnhub.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      {
        email: 'instructor@learnhub.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Chen',
        role: 'instructor'
      },
      {
        email: 'student@learnhub.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'student'
      }
    ];

    console.log('👥 Creating sample users...');
    const createdUsers = [];
    
    for (const user of users) {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [user.email, user.password, user.firstName, user.lastName, user.role]
      );
      createdUsers.push(result.rows[0]);
      console.log(`✅ Created user: ${user.email}`);
    }

    // Create user profiles
    console.log('📝 Creating user profiles...');
    for (const user of createdUsers) {
      await pool.query(
        'INSERT INTO user_profiles (user_id, country, timezone) VALUES ($1, $2, $3)',
        [user.id, 'United States', 'America/New_York']
      );
    }

    // Create instructor profile
    const instructor = createdUsers.find(u => u.role === 'instructor');
    if (instructor) {
      await pool.query(
        `INSERT INTO instructors (user_id, title, company, specializations, is_approved, rating)
         VALUES ($1, $2, $3, $4, true, 4.9)`,
        [
          instructor.id,
          'Senior Software Engineer',
          'Google',
          ['Web Development', 'JavaScript', 'React']
        ]
      );
      console.log('👨‍🏫 Created instructor profile');
    }

    // Create sample courses
    console.log('📚 Creating sample courses...');
    const courses = [
      {
        title: 'Complete Web Development Bootcamp',
        description: 'Learn web development from scratch with HTML, CSS, JavaScript, React, and Node.js',
        category: 'Development',
        level: 'beginner',
        price: 89.99,
        originalPrice: 199.99,
        duration: '65 hours',
        imageUrl: 'https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg',
        whatYouWillLearn: [
          'Build responsive websites with HTML and CSS',
          'Create interactive web apps with JavaScript',
          'Master React for frontend development',
          'Build APIs with Node.js and Express'
        ],
        requirements: [
          'No programming experience needed',
          'A computer with internet connection'
        ]
      },
      {
        title: 'Machine Learning with Python',
        description: 'Master machine learning algorithms and build real-world projects',
        category: 'Data Science',
        level: 'intermediate',
        price: 79.99,
        originalPrice: 179.99,
        duration: '44 hours',
        imageUrl: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg',
        whatYouWillLearn: [
          'Understand machine learning fundamentals',
          'Implement algorithms from scratch',
          'Use scikit-learn and TensorFlow',
          'Build and deploy ML models'
        ],
        requirements: [
          'Basic Python knowledge',
          'High school mathematics'
        ]
      }
    ];

    const createdCourses = [];
    for (const course of courses) {
      const result = await pool.query(
        `INSERT INTO courses (
          title, description, category, level, price, original_price, 
          duration, image_url, what_you_will_learn, requirements, 
          instructor_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published') 
        RETURNING *`,
        [
          course.title, course.description, course.category, course.level,
          course.price, course.originalPrice, course.duration, course.imageUrl,
          course.whatYouWillLearn, course.requirements, instructor.id
        ]
      );
      createdCourses.push(result.rows[0]);
      console.log(`✅ Created course: ${course.title}`);
    }

    // Create course modules and lessons
    console.log('📖 Creating course content...');
    for (const course of createdCourses) {
      // Create modules
      const modules = [
        { title: 'Introduction', duration: '2 hours' },
        { title: 'Fundamentals', duration: '8 hours' },
        { title: 'Advanced Topics', duration: '6 hours' }
      ];

      for (let i = 0; i < modules.length; i++) {
        const moduleResult = await pool.query(
          `INSERT INTO course_modules (course_id, title, duration, order_index)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [course.id, modules[i].title, modules[i].duration, i + 1]
        );

        const module = moduleResult.rows[0];

        // Create lessons for each module
        const lessons = [
          { title: `${modules[i].title} - Part 1`, duration: '15 min', type: 'video' },
          { title: `${modules[i].title} - Part 2`, duration: '20 min', type: 'video' },
          { title: `${modules[i].title} - Quiz`, duration: '10 min', type: 'quiz' }
        ];

        for (let j = 0; j < lessons.length; j++) {
          await pool.query(
            `INSERT INTO course_lessons (module_id, title, duration, type, order_index, is_free)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [module.id, lessons[j].title, lessons[j].duration, lessons[j].type, j + 1, i === 0 && j === 0]
          );
        }
      }
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
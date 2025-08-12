const { body, param, query, validationResult } = require('express-validator');

// Validation middleware to handle errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  name: (field) => body(field)
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(`${field} must be between 1 and 50 characters`)
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage(`${field} must contain only letters and spaces`),
  
  uuid: (field) => param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),
  
  positiveInteger: (field) => body(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`),
  
  price: body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  rating: body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  courseLevel: body('level')
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level must be beginner, intermediate, or advanced'),
  
  courseStatus: body('status')
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived')
};

// Validation schemas for different endpoints
const validationSchemas = {
  // Authentication validations
  register: [
    commonValidations.email,
    commonValidations.password,
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    body('role')
      .optional()
      .isIn(['student', 'instructor'])
      .withMessage('Role must be student or instructor'),
    handleValidationErrors
  ],

  login: [
    commonValidations.email,
    body('password').exists().withMessage('Password is required'),
    handleValidationErrors
  ],

  // Course validations
  createCourse: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 50, max: 2000 })
      .withMessage('Description must be between 50 and 2000 characters'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category is required'),
    commonValidations.courseLevel,
    commonValidations.price,
    body('duration')
      .optional()
      .matches(/^\d+(\.\d+)?\s*(hours?|minutes?|mins?)$/i)
      .withMessage('Duration must be in format like "2 hours" or "30 minutes"'),
    body('whatYouWillLearn')
      .isArray({ min: 1 })
      .withMessage('What you will learn must be an array with at least one item'),
    body('requirements')
      .isArray()
      .withMessage('Requirements must be an array'),
    handleValidationErrors
  ],

  updateCourse: [
    commonValidations.uuid('id'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 50, max: 2000 })
      .withMessage('Description must be between 50 and 2000 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category is required'),
    body('level')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Level must be beginner, intermediate, or advanced'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    handleValidationErrors
  ],

  // Review validations
  createReview: [
    body('courseId').isUUID().withMessage('Course ID must be a valid UUID'),
    commonValidations.rating,
    body('comment')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Comment must be between 10 and 1000 characters'),
    handleValidationErrors
  ],

  // User profile validations
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    body('country')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Country must be between 1 and 100 characters'),
    body('skillLevel')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Skill level must be beginner, intermediate, or advanced'),
    handleValidationErrors
  ],

  // Payment validations
  createPaymentIntent: [
    body('courseIds')
      .isArray({ min: 1 })
      .withMessage('Course IDs must be an array with at least one item'),
    body('courseIds.*')
      .isUUID()
      .withMessage('Each course ID must be a valid UUID'),
    handleValidationErrors
  ],

  // Search validations
  searchCourses: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category must be between 1 and 50 characters'),
    query('level')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Level must be beginner, intermediate, or advanced'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be a positive number'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a positive number'),
    query('rating')
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    query('sortBy')
      .optional()
      .isIn(['relevance', 'price_low', 'price_high', 'rating', 'popular', 'newest'])
      .withMessage('Sort by must be one of: relevance, price_low, price_high, rating, popular, newest'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    handleValidationErrors
  ],

  // Progress validations
  updateProgress: [
    body('courseId').isUUID().withMessage('Course ID must be a valid UUID'),
    body('lessonId').isUUID().withMessage('Lesson ID must be a valid UUID'),
    body('completed')
      .optional()
      .isBoolean()
      .withMessage('Completed must be a boolean'),
    handleValidationErrors
  ],

  // Note validations
  createNote: [
    body('courseId').isUUID().withMessage('Course ID must be a valid UUID'),
    body('lessonId').isUUID().withMessage('Lesson ID must be a valid UUID'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Note content must be between 1 and 1000 characters'),
    body('timestamp')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Timestamp must be a non-negative integer'),
    handleValidationErrors
  ]
};

module.exports = {
  validationSchemas,
  commonValidations,
  handleValidationErrors
};
const validator = require('validator');

// Email validation
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

// Password validation
const isValidPassword = (password) => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Name validation
const isValidName = (name) => {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 50;
};

// UUID validation
const isValidUUID = (uuid) => {
  return validator.isUUID(uuid);
};

// URL validation
const isValidURL = (url) => {
  return validator.isURL(url);
};

// Phone validation
const isValidPhone = (phone) => {
  return validator.isMobilePhone(phone);
};

// Price validation
const isValidPrice = (price) => {
  return typeof price === 'number' && price >= 0 && price <= 9999.99;
};

// Rating validation
const isValidRating = (rating) => {
  return typeof rating === 'number' && rating >= 1 && rating <= 5;
};

// Course level validation
const isValidCourseLevel = (level) => {
  return ['beginner', 'intermediate', 'advanced'].includes(level);
};

// Course status validation
const isValidCourseStatus = (status) => {
  return ['draft', 'published', 'archived'].includes(status);
};

// User role validation
const isValidUserRole = (role) => {
  return ['student', 'instructor', 'admin'].includes(role);
};

// Sanitize HTML content
const sanitizeHTML = (content) => {
  if (typeof content !== 'string') return '';
  
  // Remove script tags and event handlers
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

// Validate course data
const validateCourseData = (courseData) => {
  const errors = [];

  if (!courseData.title || courseData.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long');
  }

  if (!courseData.description || courseData.description.trim().length < 50) {
    errors.push('Description must be at least 50 characters long');
  }

  if (!courseData.category || courseData.category.trim().length < 1) {
    errors.push('Category is required');
  }

  if (!isValidCourseLevel(courseData.level)) {
    errors.push('Level must be beginner, intermediate, or advanced');
  }

  if (!isValidPrice(courseData.price)) {
    errors.push('Price must be a valid number between 0 and 9999.99');
  }

  return errors;
};

// Validate user registration data
const validateRegistrationData = (userData) => {
  const errors = [];

  if (!isValidEmail(userData.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!isValidPassword(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }

  if (!isValidName(userData.firstName)) {
    errors.push('First name is required and must be 1-50 characters');
  }

  if (!isValidName(userData.lastName)) {
    errors.push('Last name is required and must be 1-50 characters');
  }

  if (userData.role && !isValidUserRole(userData.role)) {
    errors.push('Role must be student, instructor, or admin');
  }

  return errors;
};

// Validate review data
const validateReviewData = (reviewData) => {
  const errors = [];

  if (!isValidUUID(reviewData.courseId)) {
    errors.push('Valid course ID is required');
  }

  if (!isValidRating(reviewData.rating)) {
    errors.push('Rating must be between 1 and 5');
  }

  if (!reviewData.comment || reviewData.comment.trim().length < 10) {
    errors.push('Comment must be at least 10 characters long');
  }

  if (reviewData.comment && reviewData.comment.length > 1000) {
    errors.push('Comment must be less than 1000 characters');
  }

  return errors;
};

// Validate search parameters
const validateSearchParams = (params) => {
  const errors = [];

  if (params.minPrice && !isValidPrice(parseFloat(params.minPrice))) {
    errors.push('Minimum price must be a valid number');
  }

  if (params.maxPrice && !isValidPrice(parseFloat(params.maxPrice))) {
    errors.push('Maximum price must be a valid number');
  }

  if (params.rating && !isValidRating(parseFloat(params.rating))) {
    errors.push('Rating must be between 1 and 5');
  }

  if (params.level && !isValidCourseLevel(params.level)) {
    errors.push('Level must be beginner, intermediate, or advanced');
  }

  if (params.limit && (isNaN(params.limit) || params.limit < 1 || params.limit > 100)) {
    errors.push('Limit must be between 1 and 100');
  }

  if (params.offset && (isNaN(params.offset) || params.offset < 0)) {
    errors.push('Offset must be a non-negative number');
  }

  return errors;
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidName,
  isValidUUID,
  isValidURL,
  isValidPhone,
  isValidPrice,
  isValidRating,
  isValidCourseLevel,
  isValidCourseStatus,
  isValidUserRole,
  sanitizeHTML,
  validateCourseData,
  validateRegistrationData,
  validateReviewData,
  validateSearchParams
};
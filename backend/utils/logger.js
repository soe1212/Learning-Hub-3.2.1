const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    this.logToFile = process.env.LOG_TO_FILE === 'true';
    this.logToConsole = process.env.LOG_TO_CONSOLE !== 'false';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
  }

  writeToFile(level, formattedMessage) {
    if (!this.logToFile) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}-${level.toLowerCase()}.log`;
    const filepath = path.join(logsDir, filename);

    fs.appendFileSync(filepath, formattedMessage + '\n');
  }

  writeToConsole(level, message, meta) {
    if (!this.logToConsole) return;

    const timestamp = new Date().toISOString();
    const colorCodes = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m'  // White
    };
    const resetCode = '\x1b[0m';

    console.log(
      `${colorCodes[level]}[${timestamp}] ${level}:${resetCode} ${message}`,
      Object.keys(meta).length > 0 ? meta : ''
    );
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    this.writeToConsole(level, message, meta);
    this.writeToFile(level, formattedMessage);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // HTTP request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      // Log request
      this.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const duration = Date.now() - start;
        
        logger.info('HTTP Response', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userId: req.user?.id
        });

        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  // Error logging middleware
  errorLogger() {
    return (err, req, res, next) => {
      this.error('HTTP Error', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.user?.id,
        body: req.body
      });

      next(err);
    };
  }

  // Database query logging
  queryLogger(query, params, duration) {
    this.debug('Database Query', {
      query: query.replace(/\s+/g, ' ').trim(),
      params,
      duration: `${duration}ms`
    });
  }

  // Authentication logging
  authLogger(event, userId, details = {}) {
    this.info('Authentication Event', {
      event,
      userId,
      ...details
    });
  }

  // Security event logging
  securityLogger(event, details = {}) {
    this.warn('Security Event', {
      event,
      ...details
    });
  }

  // Business logic logging
  businessLogger(event, details = {}) {
    this.info('Business Event', {
      event,
      ...details
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
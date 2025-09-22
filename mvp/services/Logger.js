const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
  }

  async ensureLogDir() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Log to console
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // Log to file
    try {
      const logFile = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  async info(message, data = null) {
    await this.log('info', message, data);
  }

  async error(message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null;
    await this.log('error', message, errorData);
  }

  async warn(message, data = null) {
    await this.log('warn', message, data);
  }

  async debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      await this.log('debug', message, data);
    }
  }

  // Log API requests
  async logRequest(req, res, duration) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    };
    
    if (res.statusCode >= 400) {
      await this.error('API Request Failed', logData);
    } else {
      await this.info('API Request', logData);
    }
  }

  // Log knowledge base operations
  async logKnowledgeBaseOperation(operation, knowledgeBaseId, userId, details = {}) {
    await this.info('Knowledge Base Operation', {
      operation,
      knowledgeBaseId,
      userId,
      ...details
    });
  }

  // Log git operations
  async logGitOperation(operation, url, success, error = null) {
    const logData = {
      operation,
      url,
      success
    };
    
    if (success) {
      await this.info('Git Operation Success', logData);
    } else {
      await this.error('Git Operation Failed', { ...logData, error: error?.message });
    }
  }

  // Log AI service operations
  async logAIOperation(operation, success, details = {}) {
    const logData = {
      operation,
      success,
      ...details
    };
    
    if (success) {
      await this.info('AI Operation Success', logData);
    } else {
      await this.error('AI Operation Failed', logData);
    }
  }
}

// Create a singleton instance
const logger = new Logger();

module.exports = logger;
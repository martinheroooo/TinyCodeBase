/**
 * 日志记录工具模块
 *
 * 功能：
 * - 结构化日志记录
 * - 多级别日志支持
 * - 日志文件管理
 * - 性能监控日志
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// 控制台输出格式
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;

        // 如果有堆栈信息，显示堆栈
        if (stack) {
            log += `\n${stack}`;
        }

        // 如果有元数据，显示元数据
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }

        return log;
    })
);

// 创建Winston logger实例
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'speckit-mvp',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        // 错误日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),

        // 警告日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'warn.log'),
            level: 'warn',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 3,
            tailable: true
        }),

        // 综合日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 10,
            tailable: true
        })
    ],

    // 异常处理
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log')
        })
    ],

    // 拒绝处理
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log')
        })
    ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// 扩展logger功能
class Logger {
    constructor(winstonLogger) {
        this.winston = winstonLogger;
    }

    /**
     * 记录请求日志
     */
    logRequest(req, res, responseTime) {
        const logData = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            contentLength: res.get('Content-Length') || 0
        };

        if (res.statusCode >= 400) {
            this.winston.warn('HTTP Request', logData);
        } else {
            this.winston.info('HTTP Request', logData);
        }
    }

    /**
     * 记录API调用
     */
    logApiCall(apiName, params, result, duration, error = null) {
        const logData = {
            api: apiName,
            params: this.sanitizeParams(params),
            duration: `${duration}ms`,
            success: !error
        };

        if (error) {
            logData.error = error.message;
            logData.stack = error.stack;
            this.winston.error('API Call Failed', logData);
        } else {
            logData.result = this.sanitizeResult(result);
            this.winston.info('API Call Success', logData);
        }
    }

    /**
     * 记录数据库操作
     */
    logDatabase(operation, table, duration, error = null) {
        const logData = {
            operation,
            table,
            duration: `${duration}ms`
        };

        if (error) {
            logData.error = error.message;
            this.winston.error('Database Operation Failed', logData);
        } else {
            this.winston.debug('Database Operation', logData);
        }
    }

    /**
     * 记录性能指标
     */
    logPerformance(metric, value, unit = 'ms', tags = {}) {
        const logData = {
            metric,
            value,
            unit,
            tags
        };

        this.winston.info('Performance Metric', logData);
    }

    /**
     * 记录业务事件
     */
    logEvent(event, data = {}) {
        const logData = {
            event,
            timestamp: new Date().toISOString(),
            data
        };

        this.winston.info('Business Event', logData);
    }

    /**
     * 记录安全事件
     */
    logSecurity(event, details = {}) {
        const logData = {
            securityEvent: event,
            timestamp: new Date().toISOString(),
            ip: details.ip,
            userAgent: details.userAgent,
            ...details
        };

        this.winston.warn('Security Event', logData);
    }

    /**
     * 创建子logger
     */
    child(meta = {}) {
        return this.winston.child(meta);
    }

    /**
     * 清理敏感参数
     */
    sanitizeParams(params) {
        if (!params || typeof params !== 'object') {
            return params;
        }

        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
        const sanitized = { ...params };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * 清理敏感结果
     */
    sanitizeResult(result) {
        if (!result || typeof result !== 'object') {
            return result;
        }

        // 限制结果大小以避免日志过大
        const resultStr = JSON.stringify(result);
        if (resultStr.length > 1000) {
            return '[LARGE RESULT TRUNCATED]';
        }

        return result;
    }

    // 基础日志方法
    error(message, meta = {}) {
        this.winston.error(message, meta);
    }

    warn(message, meta = {}) {
        this.winston.warn(message, meta);
    }

    info(message, meta = {}) {
        this.winston.info(message, meta);
    }

    debug(message, meta = {}) {
        this.winston.debug(message, meta);
    }

    verbose(message, meta = {}) {
        this.winston.verbose(message, meta);
    }
}

// 创建Logger实例
const loggerInstance = new Logger(logger);

// Express中间件
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // 记录请求开始
    loggerInstance.debug('Request Started', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // 监听响应结束
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        loggerInstance.logRequest(req, res, duration);
    });

    next();
};

// 错误日志中间件
const errorLogger = (err, req, res, next) => {
    loggerInstance.error('Unhandled Error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    next(err);
};

// 性能监控中间件
const performanceMonitor = (req, res, next) => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒

        loggerInstance.logPerformance('http_request_duration', duration, 'ms', {
            method: req.method,
            route: req.route?.path || req.originalUrl,
            status: res.statusCode
        });

        // 记录慢请求
        if (duration > 1000) {
            loggerInstance.warn('Slow Request Detected', {
                method: req.method,
                url: req.originalUrl,
                duration: `${duration.toFixed(2)}ms`,
                status: res.statusCode
            });
        }
    });

    next();
};

module.exports = {
    logger: loggerInstance,
    requestLogger,
    errorLogger,
    performanceMonitor
};
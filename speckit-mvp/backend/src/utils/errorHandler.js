/**
 * 错误处理工具模块
 *
 * 功能：
 * - 自定义错误类型
 * - 错误分类和处理
 * - 错误响应格式化
 * - 错误上报和监控
 */

const { logger } = require('./logger');

// 自定义错误类型
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// 验证错误
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

// 资源未找到错误
class NotFoundError extends AppError {
    constructor(resource = '资源') {
        super(`${resource}不存在`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

// 冲突错误
class ConflictError extends AppError {
    constructor(message, details = null) {
        super(message, 409, 'CONFLICT_ERROR', details);
        this.name = 'ConflictError';
    }
}

// 未授权错误
class UnauthorizedError extends AppError {
    constructor(message = '未授权访问') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

// 禁止访问错误
class ForbiddenError extends AppError {
    constructor(message = '禁止访问') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

// 业务逻辑错误
class BusinessError extends AppError {
    constructor(message, details = null) {
        super(message, 422, 'BUSINESS_ERROR', details);
        this.name = 'BusinessError';
    }
}

// 外部服务错误
class ExternalServiceError extends AppError {
    constructor(service, message, details = null) {
        super(`${service}服务错误: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
        this.name = 'ExternalServiceError';
        this.service = service;
    }
}

// 数据库错误
class DatabaseError extends AppError {
    constructor(message, details = null) {
        super(`数据库错误: ${message}`, 500, 'DATABASE_ERROR', details);
        this.name = 'DatabaseError';
    }
}

// 错误代码映射
const ERROR_CODES = {
    // 通用错误
    INTERNAL_ERROR: { message: '服务器内部错误', statusCode: 500 },
    VALIDATION_ERROR: { message: '输入验证失败', statusCode: 400 },
    NOT_FOUND: { message: '资源不存在', statusCode: 404 },
    CONFLICT_ERROR: { message: '资源冲突', statusCode: 409 },
    UNAUTHORIZED: { message: '未授权访问', statusCode: 401 },
    FORBIDDEN: { message: '禁止访问', statusCode: 403 },
    BUSINESS_ERROR: { message: '业务逻辑错误', statusCode: 422 },
    EXTERNAL_SERVICE_ERROR: { message: '外部服务错误', statusCode: 502 },
    DATABASE_ERROR: { message: '数据库错误', statusCode: 500 },

    // 业务特定错误
    PROJECT_NOT_FOUND: { message: '项目不存在', statusCode: 404 },
    PROJECT_ALREADY_EXISTS: { message: '项目已存在', statusCode: 409 },
    INVALID_PROJECT_TYPE: { message: '无效的项目类型', statusCode: 400 },
    FILE_TOO_LARGE: { message: '文件过大', statusCode: 413 },
    UNSUPPORTED_FILE_TYPE: { message: '不支持的文件类型', statusCode: 400 },
    GIT_CLONE_FAILED: { message: 'Git仓库克隆失败', statusCode: 422 },
    AI_SERVICE_ERROR: { message: 'AI服务调用失败', statusCode: 502 },
    PARSE_ERROR: { message: '代码解析失败', statusCode: 422 },
    TASK_NOT_FOUND: { message: '任务不存在', statusCode: 404 },
    TASK_ALREADY_RUNNING: { message: '任务已在运行中', statusCode: 409 }
};

// 错误处理器
class ErrorHandler {
    /**
     * 处理Express错误
     */
    static handleExpressError(err, req, res, next) {
        const error = ErrorHandler.normalizeError(err);

        // 记录错误日志
        ErrorHandler.logError(error, req);

        // 格式化错误响应
        const errorResponse = ErrorHandler.formatErrorResponse(error, req);

        res.status(error.statusCode).json(errorResponse);
    }

    /**
     * 处理异步错误
     */
    static handleAsyncError(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * 标准化错误对象
     */
    static normalizeError(err) {
        // 如果已经是AppError，直接返回
        if (err instanceof AppError) {
            return err;
        }

        // 处理数据库错误
        if (err.message.includes('SQLITE_CONSTRAINT')) {
            if (err.message.includes('UNIQUE')) {
                return new ConflictError('数据唯一性约束冲突');
            }
            if (err.message.includes('FOREIGN KEY')) {
                return new ValidationError('外键约束冲突');
            }
            return new DatabaseError(err.message);
        }

        // 处理JSON解析错误
        if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
            return new ValidationError('JSON格式错误');
        }

        // 处理文件系统错误
        if (err.code === 'ENOENT') {
            return new NotFoundError('文件');
        }
        if (err.code === 'EACCES') {
            return new ForbiddenError('文件访问权限不足');
        }

        // 处理网络错误
        if (err.code === 'ECONNREFUSED') {
            return new ExternalServiceError('网络', '连接被拒绝');
        }
        if (err.code === 'ETIMEDOUT') {
            return new ExternalServiceError('网络', '连接超时');
        }

        // 处理Joi验证错误
        if (err.isJoi) {
            const details = err.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return new ValidationError('输入验证失败', details);
        }

        // 处理Multer文件上传错误
        if (err.code === 'LIMIT_FILE_SIZE') {
            return new ValidationError('文件大小超过限制');
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return new ValidationError('文件数量超过限制');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return new ValidationError('不支持的文件字段');
        }

        // 默认内部错误
        return new AppError(
            process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
            err.statusCode || 500,
            'INTERNAL_ERROR',
            process.env.NODE_ENV === 'production' ? null : err.stack
        );
    }

    /**
     * 格式化错误响应
     */
    static formatErrorResponse(error, req) {
        const response = {
            success: false,
            error: {
                code: error.code,
                message: error.message
            }
        };

        // 开发环境添加详细信息
        if (process.env.NODE_ENV !== 'production') {
            if (error.details) {
                response.error.details = error.details;
            }
            if (error.stack) {
                response.error.stack = error.stack;
            }
        }

        // 添加请求信息
        response.request = {
            method: req.method,
            url: req.originalUrl,
            timestamp: new Date().toISOString()
        };

        return response;
    }

    /**
     * 记录错误日志
     */
    static logError(error, req) {
        const logData = {
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                statusCode: error.statusCode,
                stack: error.stack
            },
            request: {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                headers: req.headers,
                body: req.body,
                params: req.params,
                query: req.query
            }
        };

        if (error.statusCode >= 500) {
            logger.error('Server Error', logData);
        } else if (error.statusCode >= 400) {
            logger.warn('Client Error', logData);
        } else {
            logger.info('Application Error', logData);
        }
    }

    /**
     * 创建业务错误
     */
    static createBusinessError(code, customMessage = null) {
        const errorConfig = ERROR_CODES[code];
        if (!errorConfig) {
            return new AppError(customMessage || '未知业务错误', 500, code);
        }

        const message = customMessage || errorConfig.message;
        return new AppError(message, errorConfig.statusCode, code);
    }
}

module.exports = {
    // 错误类
    AppError,
    ValidationError,
    NotFoundError,
    ConflictError,
    UnauthorizedError,
    ForbiddenError,
    BusinessError,
    ExternalServiceError,
    DatabaseError,

    // 错误处理器
    ErrorHandler,

    // 错误代码
    ERROR_CODES
};
/**
 * 轻量级AI代码知识库 - 服务器入口文件
 *
 * 主要功能：
 * - Express服务器配置和启动
 * - 中间件配置
 * - 路由注册
 * - 错误处理
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { database } = require('./src/utils/database');

// 导入路由
const apiRoutes = require('./src/api');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * 中间件配置
 */
function configureMiddleware() {
    // 安全中间件
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
    }));

    // CORS配置
    const corsOptions = {
        origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        credentials: true,
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));

    // 请求解析中间件
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 日志中间件
    if (NODE_ENV === 'development') {
        app.use(morgan('dev'));
    } else {
        app.use(morgan('combined'));
    }

    // 静态文件服务
    app.use(express.static(path.join(__dirname, '../frontend/public')));
}

/**
 * 错误处理中间件
 */
function configureErrorHandling() {
    // 404处理
    app.use('*', (req, res) => {
        res.status(404).json({
            success: false,
            message: '接口不存在',
            path: req.originalUrl
        });
    });

    // 全局错误处理
    app.use((err, req, res, next) => {
        console.error('服务器错误:', err);

        // 生产环境不暴露详细错误信息
        const message = NODE_ENV === 'production'
            ? '服务器内部错误'
            : err.message;

        res.status(err.status || 500).json({
            success: false,
            message: message,
            ...(NODE_ENV === 'development' && { stack: err.stack })
        });
    });
}

/**
 * 健康检查接口
 */
function configureHealthCheck() {
    app.get('/health', async (req, res) => {
        try {
            // 检查数据库连接
            const dbStatus = database.isInitialized ? 'connected' : 'disconnected';

            // 获取数据库统计信息
            let dbStats = null;
            if (database.isInitialized) {
                dbStats = await database.getStats();
            }

            res.json({
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: NODE_ENV,
                version: process.env.npm_package_version || '1.0.0',
                database: {
                    status: dbStatus,
                    stats: dbStats
                },
                uptime: process.uptime()
            });
        } catch (error) {
            console.error('健康检查失败:', error);
            res.status(500).json({
                success: false,
                status: 'unhealthy',
                message: error.message
            });
        }
    });

    // 简单的ping接口
    app.get('/ping', (req, res) => {
        res.json({
            success: true,
            message: 'pong',
            timestamp: new Date().toISOString()
        });
    });
}

/**
 * 启动服务器
 */
async function startServer() {
    try {
        console.log('正在启动服务器...');

        // 初始化数据库
        console.log('正在初始化数据库...');
        await database.initialize();
        console.log('数据库初始化完成');

        // 配置中间件
        configureMiddleware();

        // 配置健康检查
        configureHealthCheck();

        // 注册路由
        console.log('正在注册路由...');
        app.use('/api/v1', apiRoutes);
        console.log('路由注册完成');

        // 配置错误处理
        configureErrorHandling();

        // 启动服务器
        const server = app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                          轻量级AI代码知识库                                ║
║                              服务器已启动                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  环境: ${NODE_ENV.padEnd(54)} ║
║  端口: ${PORT.toString().padEnd(54)} ║
║  地址: http://localhost:${PORT} ${''.padEnd(33)} ║
║  数据库: ${database.dbPath.padEnd(50)} ║
║  启动时间: ${new Date().toLocaleString('zh-CN').padEnd(45)} ║
╚══════════════════════════════════════════════════════════════════════════════╝
            `);

            if (NODE_ENV === 'development') {
                console.log('🚀 开发服务器已启动，请访问 http://localhost:3000');
                console.log('📊 健康检查: http://localhost:3000/health');
                console.log('📝 API文档: http://localhost:3000/api/v1');
            }
        });

        // 优雅关闭处理
        process.on('SIGTERM', () => {
            console.log('收到SIGTERM信号，正在优雅关闭服务器...');
            server.close(async () => {
                console.log('HTTP服务器已关闭');
                await database.close();
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('收到SIGINT信号，正在优雅关闭服务器...');
            server.close(async () => {
                console.log('HTTP服务器已关闭');
                await database.close();
                process.exit(0);
            });
        });

        // 未捕获的异常处理
        process.on('uncaughtException', (err) => {
            console.error('未捕获的异常:', err);
            server.close(async () => {
                await database.close();
                process.exit(1);
            });
        });

        // 未处理的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            console.error('未处理的Promise拒绝:', reason);
            console.error('Promise:', promise);
        });

        return server;
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
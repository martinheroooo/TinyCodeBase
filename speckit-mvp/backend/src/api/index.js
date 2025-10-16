/**
 * API路由入口文件
 *
 * 主要功能：
 * - 路由聚合和注册
 * - API版本管理
 * - 通用中间件应用
 */

const express = require('express');
const router = express.Router();

// 导入各模块路由
const projectRoutes = require('./routes/projects');
const documentRoutes = require('./routes/documents');
const searchRoutes = require('./routes/search');
const taskRoutes = require('./routes/tasks');

// API信息接口
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: '轻量级AI代码知识库 API v1.0',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            projects: '/projects',
            documents: '/projects/:id/documents',
            search: '/search',
            tasks: '/tasks'
        }
    });
});

// 注册子路由
router.use('/projects', projectRoutes);
router.use('/documents', documentRoutes);
router.use('/search', searchRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
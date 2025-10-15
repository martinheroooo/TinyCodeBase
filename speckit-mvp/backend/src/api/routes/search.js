/**
 * 搜索路由
 *
 * 功能：
 * - 全文搜索
 * - 按文件类型过滤
 * - 搜索结果高亮
 */

const express = require('express');
const router = express.Router();

/**
 * 全局搜索
 */
router.get('/', async (req, res) => {
    try {
        const { q: query, filters } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: '搜索关键词为必填项'
            });
        }

        // 临时实现，返回模拟搜索结果
        const mockResults = [
            {
                id: 1,
                project_id: 1,
                project_name: '示例项目',
                file_path: '/src/app.js',
                file_name: 'app.js',
                language: 'javascript',
                content_type: 'function',
                title: 'init函数',
                content: 'function init() {\n  // 初始化应用\n  console.log("应用启动");\n}',
                highlights: [
                    { start: 9, end: 12, text: 'init' }
                ],
                line: 10,
                score: 0.95
            },
            {
                id: 2,
                project_id: 1,
                project_name: '示例项目',
                file_path: '/src/utils.js',
                file_name: 'utils.js',
                language: 'javascript',
                content_type: 'comment',
                title: '初始化工具函数',
                content: '/**\n * 初始化工具函数\n * @param {Object} config 配置对象\n */',
                highlights: [
                    { start: 4, end: 7, text: '初始化' }
                ],
                line: 2,
                score: 0.85
            }
        ];

        res.json({
            success: true,
            data: {
                query,
                filters: filters ? JSON.parse(filters) : {},
                results: mockResults,
                total: mockResults.length,
                took: '15ms'
            }
        });
    } catch (error) {
        console.error('搜索失败:', error);
        res.status(500).json({
            success: false,
            message: '搜索失败',
            error: error.message
        });
    }
});

module.exports = router;
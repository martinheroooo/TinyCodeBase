/**
 * 任务管理路由
 *
 * 功能：
 * - 任务状态查询
 * - 任务进度更新
 * - 任务取消
 */

const express = require('express');
const router = express.Router();

/**
 * 获取任务状态
 */
router.get('/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        // 临时实现，返回模拟任务状态
        const mockTask = {
            id: taskId,
            project_id: 1,
            task_type: 'import',
            status: 'running',
            progress: 65,
            status_message: '正在解析代码文件...',
            result_data: null,
            error_message: null,
            started_at: new Date().toISOString(),
            completed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        res.json({
            success: true,
            data: mockTask
        });
    } catch (error) {
        console.error('获取任务状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取任务状态失败',
            error: error.message
        });
    }
});

/**
 * 获取待处理任务
 */
router.get('/pending/list', async (req, res) => {
    try {
        // 临时实现，返回空列表
        res.json({
            success: true,
            data: []
        });
    } catch (error) {
        console.error('获取待处理任务失败:', error);
        res.status(500).json({
            success: false,
            message: '获取待处理任务失败',
            error: error.message
        });
    }
});

/**
 * 取消任务
 */
router.post('/cancel', async (req, res) => {
    try {
        // 临时实现，直接返回成功
        res.json({
            success: true,
            message: '任务已取消'
        });
    } catch (error) {
        console.error('取消任务失败:', error);
        res.status(500).json({
            success: false,
            message: '取消任务失败',
            error: error.message
        });
    }
});

module.exports = router;
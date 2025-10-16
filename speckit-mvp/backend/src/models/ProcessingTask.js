/**
 * 处理任务数据模型
 *
 * 功能：
 * - 异步任务管理
 * - 任务状态跟踪
 * - 进度管理
 */

const { DatabaseHelper } = require('../utils/database');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

class ProcessingTask {
    constructor(data = {}) {
        this.id = data.id;
        this.project_id = data.project_id;
        this.task_type = data.task_type; // 'import' | 'parse' | 'analyze' | 'generate_docs' | 'index'
        this.status = data.status || 'pending'; // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
        this.progress = data.progress || 0; // 0-100
        this.status_message = data.status_message || '';
        this.result_data = data.result_data || {};
        this.error_message = data.error_message;
        this.started_at = data.started_at;
        this.completed_at = data.completed_at;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * 创建处理任务
     */
    static async create(data) {
        try {
            // 验证必填字段
            if (!data.project_id || !data.task_type) {
                throw new ValidationError('项目ID和任务类型为必填项');
            }

            const validTypes = ['import', 'parse', 'analyze', 'generate_docs', 'index'];
            if (!validTypes.includes(data.task_type)) {
                throw new ValidationError('无效的任务类型');
            }

            // 检查是否有相同类型的任务正在运行
            const runningTask = await DatabaseHelper.find(
                'processing_tasks',
                'project_id = ? AND task_type = ? AND status = ?',
                [data.project_id, data.task_type, 'running']
            );

            if (runningTask.length > 0) {
                throw new ValidationError(`已有${data.task_type}任务正在运行中`);
            }

            // 插入任务记录
            const result = await DatabaseHelper.insert('processing_tasks', {
                project_id: data.project_id,
                task_type: data.task_type,
                status: 'pending',
                progress: 0,
                status_message: '任务已创建，等待执行',
                result_data: JSON.stringify({}),
                error_message: null
            });

            const task = await ProcessingTask.findById(result.id);
            logger.info('处理任务创建成功', {
                taskId: task.id,
                projectId: task.project_id,
                taskType: task.task_type,
                status: task.status
            });

            return task;
        } catch (error) {
            logger.error('创建处理任务失败', { error: error.message, data });
            throw error;
        }
    }

    /**
     * 根据ID查找任务
     */
    static async findById(id) {
        try {
            const data = await DatabaseHelper.findById('processing_tasks', id);
            if (!data) {
                throw new NotFoundError('任务');
            }

            return new ProcessingTask({
                ...data,
                result_data: JSON.parse(data.result_data || '{}')
            });
        } catch (error) {
            logger.error('查找任务失败', { taskId: id, error: error.message });
            throw error;
        }
    }

    /**
     * 获取项目的任务列表
     */
    static async findByProject(projectId, options = {}) {
        const { taskType = null, status = null, limit = 10, orderBy = 'created_at DESC' } = options;

        try {
            let where = 'project_id = ?';
            let params = [projectId];

            // 构建查询条件
            const conditions = [];
            if (taskType) {
                conditions.push('task_type = ?');
                params.push(taskType);
            }
            if (status) {
                conditions.push('status = ?');
                params.push(status);
            }

            if (conditions.length > 0) {
                where += ' AND ' + conditions.join(' AND ');
            }

            const tasksData = await DatabaseHelper.find('processing_tasks', where, params, orderBy, limit);

            return tasksData.map(data => new ProcessingTask({
                ...data,
                result_data: JSON.parse(data.result_data || '{}')
            }));
        } catch (error) {
            logger.error('获取项目任务列表失败', {
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取运行中的任务
     */
    static async findRunning() {
        try {
            const tasksData = await DatabaseHelper.find(
                'processing_tasks',
                'status = ?',
                ['running'],
                'created_at ASC'
            );

            return tasksData.map(data => new ProcessingTask({
                ...data,
                result_data: JSON.parse(data.result_data || '{}')
            }));
        } catch (error) {
            logger.error('获取运行中任务失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 获取待处理的任务
     */
    static async findPending(limit = 10) {
        try {
            const tasksData = await DatabaseHelper.find(
                'processing_tasks',
                'status = ?',
                ['pending'],
                'created_at ASC',
                limit
            );

            return tasksData.map(data => new ProcessingTask({
                ...data,
                result_data: JSON.parse(data.result_data || '{}')
            }));
        } catch (error) {
            logger.error('获取待处理任务失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 开始执行任务
     */
    async start() {
        try {
            if (this.status !== 'pending') {
                throw new ValidationError('只能启动待处理状态的任务');
            }

            await DatabaseHelper.update(
                'processing_tasks',
                {
                    status: 'running',
                    progress: 0,
                    status_message: '任务开始执行',
                    started_at: new Date().toISOString()
                },
                'id = ?',
                [this.id]
            );

            this.status = 'running';
            this.started_at = new Date().toISOString();
            this.progress = 0;
            this.status_message = '任务开始执行';

            logger.info('任务开始执行', {
                taskId: this.id,
                projectId: this.project_id,
                taskType: this.task_type
            });
        } catch (error) {
            logger.error('启动任务失败', {
                taskId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 更新任务进度
     */
    async updateProgress(progress, message = null) {
        try {
            if (progress < 0 || progress > 100) {
                throw new ValidationError('进度必须在0-100之间');
            }

            const updateData = { progress };

            if (message) {
                updateData.status_message = message;
            }

            await DatabaseHelper.update('processing_tasks', updateData, 'id = ?', [this.id]);

            this.progress = progress;
            if (message) {
                this.status_message = message;
            }

            logger.debug('任务进度更新', {
                taskId: this.id,
                progress,
                message: this.status_message
            });
        } catch (error) {
            logger.error('更新任务进度失败', {
                taskId: this.id,
                progress,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 更新状态消息
     */
    async updateMessage(message) {
        try {
            await DatabaseHelper.update(
                'processing_tasks',
                { status_message: message },
                'id = ?',
                [this.id]
            );

            this.status_message = message;

            logger.debug('任务状态消息更新', {
                taskId: this.id,
                message
            });
        } catch (error) {
            logger.error('更新任务状态消息失败', {
                taskId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 完成任务
     */
    async complete(resultData = {}) {
        try {
            await DatabaseHelper.update(
                'processing_tasks',
                {
                    status: 'completed',
                    progress: 100,
                    status_message: '任务执行完成',
                    result_data: JSON.stringify(resultData),
                    completed_at: new Date().toISOString()
                },
                'id = ?',
                [this.id]
            );

            this.status = 'completed';
            this.progress = 100;
            this.status_message = '任务执行完成';
            this.result_data = resultData;
            this.completed_at = new Date().toISOString();

            logger.info('任务执行完成', {
                taskId: this.id,
                projectId: this.project_id,
                taskType: this.task_type,
                duration: this.getDuration()
            });
        } catch (error) {
            logger.error('完成任务失败', {
                taskId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 任务失败
     */
    async fail(errorMessage, resultData = {}) {
        try {
            await DatabaseHelper.update(
                'processing_tasks',
                {
                    status: 'failed',
                    status_message: '任务执行失败',
                    result_data: JSON.stringify(resultData),
                    error_message: errorMessage,
                    completed_at: new Date().toISOString()
                },
                'id = ?',
                [this.id]
            );

            this.status = 'failed';
            this.status_message = '任务执行失败';
            this.result_data = resultData;
            this.error_message = errorMessage;
            this.completed_at = new Date().toISOString();

            logger.error('任务执行失败', {
                taskId: this.id,
                projectId: this.project_id,
                taskType: this.task_type,
                error: errorMessage,
                duration: this.getDuration()
            });
        } catch (error) {
            logger.error('标记任务失败失败', {
                taskId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 取消任务
     */
    async cancel() {
        try {
            if (this.status === 'completed') {
                throw new ValidationError('已完成的任务无法取消');
            }

            await DatabaseHelper.update(
                'processing_tasks',
                {
                    status: 'cancelled',
                    status_message: '任务已取消',
                    completed_at: new Date().toISOString()
                },
                'id = ?',
                [this.id]
            );

            this.status = 'cancelled';
            this.status_message = '任务已取消';
            this.completed_at = new Date().toISOString();

            logger.info('任务已取消', {
                taskId: this.id,
                projectId: this.project_id,
                taskType: this.task_type
            });
        } catch (error) {
            logger.error('取消任务失败', {
                taskId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取任务执行时长
     */
    getDuration() {
        if (!this.started_at) {
            return null;
        }

        const startTime = new Date(this.started_at);
        const endTime = this.completed_at ? new Date(this.completed_at) : new Date();

        return Math.floor((endTime - startTime) / 1000); // 返回秒数
    }

    /**
     * 检查任务是否处于活动状态
     */
    isActive() {
        return ['pending', 'running'].includes(this.status);
    }

    /**
     * 检查任务是否已完成
     */
    isCompleted() {
        return ['completed', 'failed', 'cancelled'].includes(this.status);
    }

    /**
     * 删除任务记录
     */
    async delete() {
        try {
            const result = await DatabaseHelper.delete('processing_tasks', 'id = ?', [this.id]);
            if (result.changes === 0) {
                throw new NotFoundError('任务');
            }

            logger.info('任务记录删除成功', {
                taskId: this.id,
                taskType: this.task_type
            });
        } catch (error) {
            logger.error('删除任务记录失败', {
                taskId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 清理旧任务记录
     */
    static async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 默认7天
        try {
            const cutoffDate = new Date(Date.now() - maxAge).toISOString();

            const result = await DatabaseHelper.delete(
                'processing_tasks',
                'status IN (?, ?, ?) AND completed_at < ?',
                ['completed', 'failed', 'cancelled', cutoffDate]
            );

            if (result.changes > 0) {
                logger.info('清理旧任务记录完成', {
                    deletedCount: result.changes,
                    cutoffDate
                });
            }
        } catch (error) {
            logger.error('清理旧任务记录失败', { error: error.message });
        }
    }

    /**
     * 获取任务统计信息
     */
    static async getStats(projectId = null) {
        try {
            let where = '';
            let params = [];

            if (projectId) {
                where = 'project_id = ?';
                params = [projectId];
            }

            const stats = {
                total: 0,
                pending: 0,
                running: 0,
                completed: 0,
                failed: 0,
                cancelled: 0,
                averageDuration: 0
            };

            // 总数统计
            const totalResult = await DatabaseHelper.find(
                'processing_tasks',
                where,
                params
            );
            stats.total = totalResult.length;

            // 状态统计
            const statusStats = await DatabaseHelper.find(
                'processing_tasks',
                where + (where ? ' AND ' : '') + 'status = ?',
                [...params, 'completed']
            );
            stats.completed = statusStats.length;

            // 计算平均执行时间
            if (stats.completed > 0) {
                let totalDuration = 0;
                for (const task of statusStats) {
                    if (task.started_at && task.completed_at) {
                        const duration = Math.floor((new Date(task.completed_at) - new Date(task.started_at)) / 1000);
                        totalDuration += duration;
                    }
                }
                stats.averageDuration = Math.floor(totalDuration / stats.completed);
            }

            // 其他状态统计
            for (const status of ['pending', 'running', 'failed', 'cancelled']) {
                const statusResult = await DatabaseHelper.find(
                    'processing_tasks',
                    where + (where ? ' AND ' : '') + 'status = ?',
                    [...params, status]
                );
                stats[status] = statusResult.length;
            }

            return stats;
        } catch (error) {
            logger.error('获取任务统计信息失败', { projectId, error: error.message });
            throw error;
        }
    }

    /**
     * 获取任务摘要信息
     */
    getSummary() {
        return {
            id: this.id,
            project_id: this.project_id,
            task_type: this.task_type,
            status: this.status,
            progress: this.progress,
            status_message: this.status_message,
            started_at: this.started_at,
            completed_at: this.completed_at,
            duration: this.getDuration()
        };
    }

    /**
     * 获取任务详细信息
     */
    getDetails() {
        return {
            id: this.id,
            project_id: this.project_id,
            task_type: this.task_type,
            status: this.status,
            progress: this.progress,
            status_message: this.status_message,
            result_data: this.result_data,
            error_message: this.error_message,
            started_at: this.started_at,
            completed_at: this.completed_at,
            created_at: this.created_at,
            updated_at: this.updated_at,
            duration: this.getDuration()
        };
    }

    /**
     * 序列化为JSON
     */
    toJSON() {
        return this.getDetails();
    }
}

module.exports = ProcessingTask;
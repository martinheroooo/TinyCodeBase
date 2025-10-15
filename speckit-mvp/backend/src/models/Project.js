/**
 * 项目数据模型
 *
 * 功能：
 * - 项目数据操作封装
 * - 项目状态管理
 * - 项目配置处理
 */

const { DatabaseHelper } = require('../utils/database');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

class Project {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description || '';
        this.type = data.type; // 'git' | 'local'
        this.source_path = data.source_path;
        this.branch = data.branch || null;
        this.status = data.status || 'pending'; // 'pending' | 'processing' | 'completed' | 'failed'
        this.config = data.config || {};
        this.stats = data.stats || {};
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * 创建新项目
     */
    static async create(data) {
        try {
            // 验证必填字段
            if (!data.name || !data.type || !data.source_path) {
                throw new ValidationError('项目名称、类型和源路径为必填项');
            }

            if (!['git', 'local'].includes(data.type)) {
                throw new ValidationError('项目类型必须是 git 或 local');
            }

            // 检查项目名称是否已存在
            const existingProject = await DatabaseHelper.find('projects', 'name = ?', [data.name]);
            if (existingProject.length > 0) {
                throw new ConflictError('项目名称已存在');
            }

            // 插入项目记录
            const result = await DatabaseHelper.insert('projects', {
                name: data.name,
                description: data.description || '',
                type: data.type,
                source_path: data.source_path,
                branch: data.branch || null,
                status: 'pending',
                config: JSON.stringify(data.config || {}),
                stats: JSON.stringify({})
            });

            const project = await Project.findById(result.id);
            logger.info('项目创建成功', { projectId: project.id, name: project.name, type: project.type });

            return project;
        } catch (error) {
            logger.error('创建项目失败', { error: error.message, data });
            throw error;
        }
    }

    /**
     * 根据ID查找项目
     */
    static async findById(id) {
        try {
            const data = await DatabaseHelper.findById('projects', id);
            if (!data) {
                throw new NotFoundError('项目');
            }

            return new Project({
                ...data,
                config: JSON.parse(data.config || '{}'),
                stats: JSON.parse(data.stats || '{}')
            });
        } catch (error) {
            logger.error('查找项目失败', { projectId: id, error: error.message });
            throw error;
        }
    }

    /**
     * 根据名称查找项目
     */
    static async findByName(name) {
        try {
            const data = await DatabaseHelper.find('projects', 'name = ?', [name]);
            if (data.length === 0) {
                throw new NotFoundError('项目');
            }

            const projectData = data[0];
            return new Project({
                ...projectData,
                config: JSON.parse(projectData.config || '{}'),
                stats: JSON.parse(projectData.stats || '{}')
            });
        } catch (error) {
            logger.error('根据名称查找项目失败', { name, error: error.message });
            throw error;
        }
    }

    /**
     * 获取所有项目
     */
    static async findAll(options = {}) {
        const { status, type, limit = 50, offset = 0, orderBy = 'created_at DESC' } = options;

        try {
            let where = '';
            let params = [];

            // 构建查询条件
            const conditions = [];
            if (status) {
                conditions.push('status = ?');
                params.push(status);
            }
            if (type) {
                conditions.push('type = ?');
                params.push(type);
            }

            if (conditions.length > 0) {
                where = conditions.join(' AND ');
            }

            const projectsData = await DatabaseHelper.find('projects', where, params, orderBy, `${limit} OFFSET ${offset}`);

            return projectsData.map(data => new Project({
                ...data,
                config: JSON.parse(data.config || '{}'),
                stats: JSON.parse(data.stats || '{}')
            }));
        } catch (error) {
            logger.error('获取项目列表失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 更新项目状态
     */
    async updateStatus(status, errorMessage = null) {
        try {
            const validStatuses = ['pending', 'processing', 'completed', 'failed'];
            if (!validStatuses.includes(status)) {
                throw new ValidationError('无效的项目状态');
            }

            const updateData = { status };

            if (status === 'failed' && errorMessage) {
                updateData.config = { ...this.config, last_error: errorMessage };
            }

            await DatabaseHelper.update('projects', updateData, 'id = ?', [this.id]);
            this.status = status;

            logger.info('项目状态更新', {
                projectId: this.id,
                name: this.name,
                status,
                errorMessage
            });
        } catch (error) {
            logger.error('更新项目状态失败', {
                projectId: this.id,
                status,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 更新项目配置
     */
    async updateConfig(config) {
        try {
            const newConfig = { ...this.config, ...config };
            await DatabaseHelper.update(
                'projects',
                { config: JSON.stringify(newConfig) },
                'id = ?',
                [this.id]
            );
            this.config = newConfig;

            logger.info('项目配置更新', { projectId: this.id, name: this.name });
        } catch (error) {
            logger.error('更新项目配置失败', {
                projectId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 更新项目统计信息
     */
    async updateStats(stats) {
        try {
            const newStats = { ...this.stats, ...stats };
            await DatabaseHelper.update(
                'projects',
                { stats: JSON.stringify(newStats) },
                'id = ?',
                [this.id]
            );
            this.stats = newStats;

            logger.info('项目统计信息更新', {
                projectId: this.id,
                name: this.name,
                stats: newStats
            });
        } catch (error) {
            logger.error('更新项目统计信息失败', {
                projectId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 删除项目
     */
    async delete() {
        try {
            const result = await DatabaseHelper.delete('projects', 'id = ?', [this.id]);
            if (result.changes === 0) {
                throw new NotFoundError('项目');
            }

            logger.info('项目删除成功', { projectId: this.id, name: this.name });
        } catch (error) {
            logger.error('删除项目失败', {
                projectId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取项目文件列表
     */
    async getFiles(options = {}) {
        const { status = null, language = null, limit = 1000, offset = 0 } = options;

        try {
            let where = 'project_id = ?';
            let params = [this.id];

            // 构建查询条件
            const conditions = [];
            if (status) {
                conditions.push('status = ?');
                params.push(status);
            }
            if (language) {
                conditions.push('language = ?');
                params.push(language);
            }

            if (conditions.length > 0) {
                where += ' AND ' + conditions.join(' AND ');
            }

            const filesData = await DatabaseHelper.find('files', where, params, 'relative_path ASC', `${limit} OFFSET ${offset}`);
            return filesData;
        } catch (error) {
            logger.error('获取项目文件列表失败', {
                projectId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取项目文档节点
     */
    async getDocumentNodes(options = {}) {
        const { nodeType = null, parentId = null, level = null } = options;

        try {
            let where = 'project_id = ?';
            let params = [this.id];

            // 构建查询条件
            const conditions = [];
            if (nodeType) {
                conditions.push('node_type = ?');
                params.push(nodeType);
            }
            if (parentId !== null) {
                conditions.push('parent_id = ?');
                params.push(parentId);
            }
            if (level !== null) {
                conditions.push('level = ?');
                params.push(level);
            }

            if (conditions.length > 0) {
                where += ' AND ' + conditions.join(' AND ');
            }

            const nodesData = await DatabaseHelper.find('document_nodes', where, params, 'sort_order ASC, name ASC');
            return nodesData;
        } catch (error) {
            logger.error('获取项目文档节点失败', {
                projectId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取项目处理任务
     */
    async getTasks(options = {}) {
        const { taskType = null, status = null, limit = 10 } = options;

        try {
            let where = 'project_id = ?';
            let params = [this.id];

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

            const tasksData = await DatabaseHelper.find('processing_tasks', where, params, 'created_at DESC', limit);
            return tasksData;
        } catch (error) {
            logger.error('获取项目任务失败', {
                projectId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 检查项目是否正在处理中
     */
    async isProcessing() {
        try {
            const runningTasks = await DatabaseHelper.find(
                'processing_tasks',
                'project_id = ? AND status = ?',
                [this.id, 'running'],
                'created_at DESC',
                1
            );

            return runningTasks.length > 0;
        } catch (error) {
            logger.error('检查项目处理状态失败', {
                projectId: this.id,
                error: error.message
            });
            return false;
        }
    }

    /**
     * 获取项目摘要信息
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            status: this.status,
            stats: this.stats,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * 获取项目详细信息
     */
    getDetails() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            source_path: this.source_path,
            branch: this.branch,
            status: this.status,
            config: this.config,
            stats: this.stats,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * 序列化为JSON
     */
    toJSON() {
        return this.getDetails();
    }
}

module.exports = Project;
/**
 * 项目控制器
 *
 * 功能：
 * - 项目CRUD操作
 * - 项目导入和重新生成
 * - 项目状态管理
 * - 业务逻辑处理
 */

const Project = require('../models/Project');
const ProcessingTask = require('../models/ProcessingTask');
const { logger } = require('../utils/logger');
const {
    ValidationError,
    NotFoundError,
    ConflictError,
    BusinessError
} = require('../utils/errorHandler');

class ProjectController {
    /**
     * 获取项目列表
     */
    async getProjects(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                type
            } = req.query;

            const options = {
                status: status || undefined,
                type: type || undefined,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit)
            };

            const projects = await Project.findAll(options);
            const totalProjects = await this._getProjectCount(options);

            logger.info('获取项目列表', {
                count: projects.length,
                page,
                limit,
                status,
                type
            });

            res.json({
                success: true,
                data: projects.map(project => project.getSummary()),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalProjects,
                    totalPages: Math.ceil(totalProjects / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('获取项目列表失败', { error: error.message });
            res.status(500).json({
                success: false,
                message: '获取项目列表失败',
                error: error.message
            });
        }
    }

    /**
     * 获取项目详情
     */
    async getProject(req, res) {
        try {
            const { id } = req.params;
            const projectId = parseInt(id);

            if (isNaN(projectId)) {
                throw new ValidationError('无效的项目ID');
            }

            const project = await Project.findById(projectId);
            const projectDetails = project.getDetails();

            // 获取项目统计信息
            const stats = await this._getProjectStats(projectId);
            projectDetails.stats = stats;

            logger.info('获取项目详情', { projectId, name: project.name });

            res.json({
                success: true,
                data: projectDetails
            });
        } catch (error) {
            this._handleError(error, '获取项目详情失败', res);
        }
    }

    /**
     * 创建新项目
     */
    async createProject(req, res) {
        try {
            const {
                name,
                type,
                source_path,
                description,
                branch,
                config
            } = req.body;

            // 验证必填字段
            if (!name || !type || !source_path) {
                throw new ValidationError('项目名称、类型和源路径为必填项');
            }

            if (!['git', 'local'].includes(type)) {
                throw new ValidationError('项目类型必须是 git 或 local');
            }

            // 验证项目名称
            if (name.length < 1 || name.length > 255) {
                throw new ValidationError('项目名称长度必须在1-255字符之间');
            }

            // 验证源路径
            if (type === 'git') {
                this._validateGitUrl(source_path);
            } else if (type === 'local') {
                this._validateLocalPath(source_path);
            }

            const projectData = {
                name: name.trim(),
                description: description?.trim() || '',
                type,
                source_path: source_path.trim(),
                branch: branch?.trim() || null,
                config: config || {}
            };

            // 创建项目
            const project = await Project.create(projectData);

            logger.info('项目创建成功', {
                projectId: project.id,
                name: project.name,
                type: project.type,
                source_path: project.source_path
            });

            res.status(201).json({
                success: true,
                message: '项目创建成功',
                data: project.getSummary()
            });
        } catch (error) {
            this._handleError(error, '创建项目失败', res);
        }
    }

    /**
     * 删除项目
     */
    async deleteProject(req, res) {
        try {
            const { id } = req.params;
            const projectId = parseInt(id);

            if (isNaN(projectId)) {
                throw new ValidationError('无效的项目ID');
            }

            // 检查项目是否存在
            const project = await Project.findById(projectId);

            // 检查是否有正在运行的任务
            const isProcessing = await project.isProcessing();
            if (isProcessing) {
                throw new BusinessError('项目正在处理中，无法删除');
            }

            // 删除项目
            await project.delete();

            logger.info('项目删除成功', {
                projectId,
                name: project.name,
                type: project.type
            });

            res.json({
                success: true,
                message: '项目删除成功'
            });
        } catch (error) {
            this._handleError(error, '删除项目失败', res);
        }
    }

    /**
     * 重新生成项目文档
     */
    async regenerateProject(req, res) {
        try {
            const { id } = req.params;
            const projectId = parseInt(id);

            if (isNaN(projectId)) {
                throw new ValidationError('无效的项目ID');
            }

            // 检查项目是否存在
            const project = await Project.findById(projectId);

            // 检查是否有正在运行的任务
            const isProcessing = await project.isProcessing();
            if (isProcessing) {
                throw new BusinessError('项目正在处理中，请等待当前任务完成');
            }

            // 创建重新生成任务
            const task = await ProcessingTask.create({
                project_id: projectId,
                task_type: 'import', // 重新导入并分析
                status_message: '开始重新生成项目文档'
            });

            // 更新项目状态
            await project.updateStatus('processing');

            logger.info('开始重新生成项目文档', {
                projectId,
                taskId: task.id,
                name: project.name
            });

            // 在实际实现中，这里会启动后台任务
            // 目前只返回任务信息
            res.json({
                success: true,
                message: '开始重新生成文档',
                data: {
                    project_id: projectId,
                    task_id: task.id,
                    status: 'started'
                }
            });
        } catch (error) {
            this._handleError(error, '重新生成文档失败', res);
        }
    }

    /**
     * 获取项目统计信息
     */
    async getProjectStats(req, res) {
        try {
            const { id } = req.params;
            const projectId = parseInt(id);

            if (isNaN(projectId)) {
                throw new ValidationError('无效的项目ID');
            }

            const project = await Project.findById(projectId);
            const stats = await this._getProjectStats(projectId);

            logger.debug('获取项目统计信息', { projectId, name: project.name });

            res.json({
                success: true,
                data: {
                    project_id: projectId,
                    ...stats
                }
            });
        } catch (error) {
            this._handleError(error, '获取项目统计信息失败', res);
        }
    }

    /**
     * 更新项目配置
     */
    async updateProjectConfig(req, res) {
        try {
            const { id } = req.params;
            const projectId = parseInt(id);
            const { config } = req.body;

            if (isNaN(projectId)) {
                throw new ValidationError('无效的项目ID');
            }

            if (!config || typeof config !== 'object') {
                throw new ValidationError('配置必须是一个对象');
            }

            const project = await Project.findById(projectId);
            await project.updateConfig(config);

            logger.info('项目配置更新成功', {
                projectId,
                name: project.name,
                configKeys: Object.keys(config)
            });

            res.json({
                success: true,
                message: '项目配置更新成功',
                data: project.getSummary()
            });
        } catch (error) {
            this._handleError(error, '更新项目配置失败', res);
        }
    }

    /**
     * 获取项目任务列表
     */
    async getProjectTasks(req, res) {
        try {
            const { id } = req.params;
            const projectId = parseInt(id);
            const { taskType, status, limit = 10 } = req.query;

            if (isNaN(projectId)) {
                throw new ValidationError('无效的项目ID');
            }

            const project = await Project.findById(projectId);
            const tasks = await project.getTasks({
                taskType: taskType || undefined,
                status: status || undefined,
                limit: parseInt(limit)
            });

            logger.debug('获取项目任务列表', {
                projectId,
                name: project.name,
                count: tasks.length
            });

            res.json({
                success: true,
                data: tasks.map(task => task.getSummary())
            });
        } catch (error) {
            this._handleError(error, '获取项目任务列表失败', res);
        }
    }

    /**
     * 验证Git URL格式
     */
    _validateGitUrl(url) {
        const gitUrlPatterns = [
            /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\.git$/,
            /^https:\/\/gitlab\.com\/[\w\-\.]+\/[\w\-\.]+\.git$/,
            /^git@github\.com:[\w\-\.]+\/[\w\-\.]+\.git$/,
            /^https:\/\/bitbucket\.org\/[\w\-\.]+\/[\w\-\.]+\.git$/,
            /^https:\/\/[\w\-\.]+\/[\w\-\.]+\/[\w\-\.]+\.git$/
        ];

        const isValid = gitUrlPatterns.some(pattern => pattern.test(url));
        if (!isValid) {
            throw new ValidationError('无效的Git仓库URL格式');
        }
    }

    /**
     * 验证本地路径格式
     */
    _validateLocalPath(path) {
        // 基本的路径格式验证
        if (!path || path.length < 1) {
            throw new ValidationError('本地路径不能为空');
        }

        // 检查是否包含非法字符
        const invalidChars = /[<>:"|?*]/;
        if (invalidChars.test(path)) {
            throw new ValidationError('本地路径包含非法字符');
        }

        // 检查是否是绝对路径或相对路径
        if (!path.startsWith('/') && !path.startsWith('./') && !path.startsWith('../')) {
            // 不是绝对路径也不是相对路径，可能是相对路径
            // 这里不做严格验证，让服务层来处理
        }
    }

    /**
     * 获取项目数量
     */
    async _getProjectCount(options) {
        try {
            const projects = await Project.findAll(options);
            return projects.length;
        } catch (error) {
            logger.error('获取项目数量失败', { error: error.message });
            return 0;
        }
    }

    /**
     * 获取项目详细统计信息
     */
    async _getProjectStats(projectId) {
        try {
            // 获取项目文件统计
            const files = await Project.findById(projectId).then(project => project.getFiles());
            const codeFiles = files.filter(file => file.language !== 'text');

            // 获取项目任务统计
            const tasks = await Project.findById(projectId).then(project => project.getTasks());

            // 获取文档节点统计
            const documentNodes = await Project.findById(projectId).then(project => project.getDocumentNodes());

            return {
                file_count: files.length,
                code_file_count: codeFiles.length,
                document_node_count: documentNodes.length,
                task_count: tasks.length,
                completed_task_count: tasks.filter(task => task.status === 'completed').length,
                running_task_count: tasks.filter(task => task.status === 'running').length,
                failed_task_count: tasks.filter(task => task.status === 'failed').length,
                languages: this._getLanguageStats(codeFiles),
                total_size: files.reduce((sum, file) => sum + (file.file_size || 0), 0)
            };
        } catch (error) {
            logger.error('获取项目统计信息失败', { projectId, error: error.message });
            return {
                file_count: 0,
                code_file_count: 0,
                document_node_count: 0,
                task_count: 0,
                completed_task_count: 0,
                running_task_count: 0,
                failed_task_count: 0,
                languages: [],
                total_size: 0
            };
        }
    }

    /**
     * 获取语言统计信息
     */
    _getLanguageStats(files) {
        const languageCount = {};

        files.forEach(file => {
            if (file.language) {
                languageCount[file.language] = (languageCount[file.language] || 0) + 1;
            }
        });

        return Object.entries(languageCount)
            .map(([language, count]) => ({
                name: language,
                file_count: count
            }))
            .sort((a, b) => b.file_count - a.file_count);
    }

    /**
     * 统一错误处理
     */
    _handleError(error, defaultMessage, res) {
        logger.error(defaultMessage, { error: error.message, stack: error.stack });

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                error: 'VALIDATION_ERROR'
            });
        }

        if (error instanceof NotFoundError) {
            return res.status(404).json({
                success: false,
                message: error.message,
                error: 'NOT_FOUND'
            });
        }

        if (error instanceof ConflictError) {
            return res.status(409).json({
                success: false,
                message: error.message,
                error: 'CONFLICT_ERROR'
            });
        }

        if (error instanceof BusinessError) {
            return res.status(422).json({
                success: false,
                message: error.message,
                error: 'BUSINESS_ERROR'
            });
        }

        // 默认服务器错误
        res.status(500).json({
            success: false,
            message: defaultMessage,
            error: 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV !== 'production' && {
                details: error.message,
                stack: error.stack
            })
        });
    }
}

module.exports = new ProjectController();
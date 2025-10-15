/**
 * 项目管理路由
 *
 * 功能：
 * - 项目创建、查询、删除
 * - Git仓库和本地文件夹导入
 * - 项目重新生成和导出
 */

const express = require('express');
const router = express.Router();
const { DatabaseHelper } = require('../../utils/database');

// 临时实现，后续会替换为实际的服务层调用
const projectService = {
    async createProject(data) {
        // 临时实现，后续会完善
        const result = await DatabaseHelper.insert('projects', {
            name: data.name,
            description: data.description || '',
            type: data.type,
            source_path: data.source_path,
            branch: data.branch || null,
            status: 'pending',
            config: JSON.stringify(data.config || {}),
            stats: '{}'
        });
        return { id: result.id, ...data, status: 'pending' };
    },

    async getProjects() {
        return await DatabaseHelper.find('projects', '', [], 'created_at DESC');
    },

    async getProject(id) {
        return await DatabaseHelper.findById('projects', id);
    },

    async deleteProject(id) {
        const result = await DatabaseHelper.delete('projects', 'id = ?', [id]);
        return result.changes > 0;
    }
};

/**
 * 获取项目列表
 */
router.get('/', async (req, res) => {
    try {
        const projects = await projectService.getProjects();
        res.json({
            success: true,
            data: projects.map(project => ({
                ...project,
                config: JSON.parse(project.config || '{}'),
                stats: JSON.parse(project.stats || '{}')
            }))
        });
    } catch (error) {
        console.error('获取项目列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取项目列表失败',
            error: error.message
        });
    }
});

/**
 * 创建新项目
 */
router.post('/', async (req, res) => {
    try {
        const { name, type, source_path, description, branch, config } = req.body;

        // 基本验证
        if (!name || !type || !source_path) {
            return res.status(400).json({
                success: false,
                message: '项目名称、类型和源路径为必填项'
            });
        }

        if (!['git', 'local'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: '项目类型必须是 git 或 local'
            });
        }

        // 检查项目名称是否已存在
        const existingProject = await DatabaseHelper.find('projects', 'name = ?', [name]);
        if (existingProject.length > 0) {
            return res.status(409).json({
                success: false,
                message: '项目名称已存在'
            });
        }

        const projectData = {
            name,
            description: description || '',
            type,
            source_path,
            branch: branch || null,
            config: config || {}
        };

        const project = await projectService.createProject(projectData);

        res.status(201).json({
            success: true,
            message: '项目创建成功',
            data: project
        });
    } catch (error) {
        console.error('创建项目失败:', error);
        res.status(500).json({
            success: false,
            message: '创建项目失败',
            error: error.message
        });
    }
});

/**
 * 获取项目详情
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const project = await projectService.getProject(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在'
            });
        }

        res.json({
            success: true,
            data: {
                ...project,
                config: JSON.parse(project.config || '{}'),
                stats: JSON.parse(project.stats || '{}')
            }
        });
    } catch (error) {
        console.error('获取项目详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取项目详情失败',
            error: error.message
        });
    }
});

/**
 * 删除项目
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 检查项目是否存在
        const project = await projectService.getProject(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在'
            });
        }

        const success = await projectService.deleteProject(id);

        if (success) {
            res.json({
                success: true,
                message: '项目删除成功'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '项目删除失败'
            });
        }
    } catch (error) {
        console.error('删除项目失败:', error);
        res.status(500).json({
            success: false,
            message: '删除项目失败',
            error: error.message
        });
    }
});

/**
 * 重新生成项目文档
 */
router.post('/:id/regenerate', async (req, res) => {
    try {
        const { id } = req.params;

        // 检查项目是否存在
        const project = await projectService.getProject(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在'
            });
        }

        // 临时实现，后续会启动重新生成任务
        res.json({
            success: true,
            message: '开始重新生成文档',
            data: {
                project_id: id,
                task_id: `task_${Date.now()}`,
                status: 'started'
            }
        });
    } catch (error) {
        console.error('重新生成文档失败:', error);
        res.status(500).json({
            success: false,
            message: '重新生成文档失败',
            error: error.message
        });
    }
});

/**
 * 导出项目文档
 */
router.post('/:id/export', async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'markdown' } = req.body;

        // 检查项目是否存在
        const project = await projectService.getProject(id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在'
            });
        }

        // 临时实现，后续会生成实际的导出文件
        const filename = `${project.name}_documentation.${format}`;
        const exportUrl = `/exports/${filename}`;

        res.json({
            success: true,
            message: '文档导出成功',
            data: {
                filename,
                url: exportUrl,
                format,
                size: '0KB'
            }
        });
    } catch (error) {
        console.error('导出文档失败:', error);
        res.status(500).json({
            success: false,
            message: '导出文档失败',
            error: error.message
        });
    }
});

module.exports = router;
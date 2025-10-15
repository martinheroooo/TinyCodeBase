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
const projectController = require('../../controllers/projects');
const Project = require('../../models/Project');

/**
 * 获取项目列表
 */
router.get('/', projectController.getProjects.bind(projectController));

/**
 * 创建新项目
 */
router.post('/', projectController.createProject.bind(projectController));

/**
 * 获取项目详情
 */
router.get('/:id', projectController.getProject.bind(projectController));

/**
 * 删除项目
 */
router.delete('/:id', projectController.deleteProject.bind(projectController));

/**
 * 重新生成项目文档
 */
router.post('/:id/regenerate', projectController.regenerateProject.bind(projectController));

/**
 * 获取项目统计信息
 */
router.get('/:id/stats', projectController.getProjectStats.bind(projectController));

/**
 * 更新项目配置
 */
router.put('/:id/config', projectController.updateProjectConfig.bind(projectController));

/**
 * 获取项目任务列表
 */
router.get('/:id/tasks', projectController.getProjectTasks.bind(projectController));

/**
 * 导出项目文档
 */
router.post('/:id/export', async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'markdown' } = req.body;

        // 检查项目是否存在
        const project = await Project.findById(parseInt(id));
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
/**
 * 文档节点数据模型
 *
 * 功能：
 * - 文档节点数据操作封装
 * - 文档树结构管理
 * - 节点关系处理
 */

const { DatabaseHelper } = require('../utils/database');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

class DocumentNode {
    constructor(data = {}) {
        this.id = data.id;
        this.project_id = data.project_id;
        this.file_id = data.file_id;
        this.node_type = data.node_type; // 'file' | 'directory' | 'function' | 'class' | 'variable' | 'import' | 'export'
        this.name = data.name;
        this.relative_path = data.relative_path;
        this.content = data.content;
        this.metadata = data.metadata || {};
        this.parent_id = data.parent_id;
        this.level = data.level || 0;
        this.sort_order = data.sort_order || 0;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * 创建文档节点
     */
    static async create(data) {
        try {
            // 验证必填字段
            if (!data.project_id || !data.node_type || !data.name) {
                throw new ValidationError('项目ID、节点类型和名称为必填项');
            }

            const validTypes = ['file', 'directory', 'function', 'class', 'variable', 'import', 'export'];
            if (!validTypes.includes(data.node_type)) {
                throw new ValidationError('无效的节点类型');
            }

            // 如果指定了父节点，验证父节点存在
            if (data.parent_id) {
                const parent = await DatabaseHelper.findById('document_nodes', data.parent_id);
                if (!parent) {
                    throw new NotFoundError('父节点');
                }
            }

            // 插入文档节点记录
            const result = await DatabaseHelper.insert('document_nodes', {
                project_id: data.project_id,
                file_id: data.file_id || null,
                node_type: data.node_type,
                name: data.name,
                relative_path: data.relative_path || null,
                content: data.content || null,
                metadata: JSON.stringify(data.metadata || {}),
                parent_id: data.parent_id || null,
                level: data.level || 0,
                sort_order: data.sort_order || 0
            });

            const node = await DocumentNode.findById(result.id);
            logger.info('文档节点创建成功', {
                nodeId: node.id,
                projectId: node.project_id,
                type: node.node_type,
                name: node.name,
                parentId: node.parent_id
            });

            return node;
        } catch (error) {
            logger.error('创建文档节点失败', { error: error.message, data });
            throw error;
        }
    }

    /**
     * 根据ID查找文档节点
     */
    static async findById(id) {
        try {
            const data = await DatabaseHelper.findById('document_nodes', id);
            if (!data) {
                throw new NotFoundError('文档节点');
            }

            return new DocumentNode({
                ...data,
                metadata: JSON.parse(data.metadata || '{}')
            });
        } catch (error) {
            logger.error('查找文档节点失败', { nodeId: id, error: error.message });
            throw error;
        }
    }

    /**
     * 根据项目ID和路径查找文档节点
     */
    static async findByPath(projectId, relativePath, nodeType = 'file') {
        try {
            const data = await DatabaseHelper.find(
                'document_nodes',
                'project_id = ? AND relative_path = ? AND node_type = ?',
                [projectId, relativePath, nodeType]
            );

            if (data.length === 0) {
                return null;
            }

            return new DocumentNode({
                ...data[0],
                metadata: JSON.parse(data[0].metadata || '{}')
            });
        } catch (error) {
            logger.error('根据路径查找文档节点失败', {
                projectId,
                relativePath,
                nodeType,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取项目的文档节点列表
     */
    static async findByProject(projectId, options = {}) {
        const { nodeType = null, parentId = null, level = null, includeContent = false } = options;

        try {
            let where = 'project_id = ?';
            let params = [projectId];

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

            const selectFields = includeContent ? '*' : 'id, project_id, file_id, node_type, name, relative_path, metadata, parent_id, level, sort_order, created_at, updated_at';
            const nodesData = await DatabaseHelper.find(
                'document_nodes',
                where,
                params,
                'level ASC, sort_order ASC, name ASC'
            );

            return nodesData.map(data => new DocumentNode({
                ...data,
                metadata: JSON.parse(data.metadata || '{}')
            }));
        } catch (error) {
            logger.error('获取项目文档节点失败', {
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取文件的文档节点
     */
    static async findByFile(fileId, options = {}) {
        const { nodeType = null, includeContent = true } = options;

        try {
            let where = 'file_id = ?';
            let params = [fileId];

            if (nodeType) {
                where += ' AND node_type = ?';
                params.push(nodeType);
            }

            const selectFields = includeContent ? '*' : 'id, project_id, file_id, node_type, name, relative_path, metadata, parent_id, level, sort_order, created_at, updated_at';
            const nodesData = await DatabaseHelper.find(
                'document_nodes',
                where,
                params,
                'level ASC, sort_order ASC, name ASC'
            );

            return nodesData.map(data => new DocumentNode({
                ...data,
                metadata: JSON.parse(data.metadata || '{}')
            }));
        } catch (error) {
            logger.error('获取文件文档节点失败', {
                fileId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取文档树的根节点
     */
    static async getRootNodes(projectId) {
        return await DocumentNode.findByProject(projectId, {
            parentId: null,
            level: 0
        });
    }

    /**
     * 获取子节点
     */
    async getChildren(options = {}) {
        const { nodeType = null, includeContent = false } = options;

        try {
            let where = 'parent_id = ?';
            let params = [this.id];

            if (nodeType) {
                where += ' AND node_type = ?';
                params.push(nodeType);
            }

            const selectFields = includeContent ? '*' : 'id, project_id, file_id, node_type, name, relative_path, metadata, parent_id, level, sort_order, created_at, updated_at';
            const childrenData = await DatabaseHelper.find(
                'document_nodes',
                where,
                params,
                'sort_order ASC, name ASC'
            );

            return childrenData.map(data => new DocumentNode({
                ...data,
                metadata: JSON.parse(data.metadata || '{}')
            }));
        } catch (error) {
            logger.error('获取子节点失败', {
                nodeId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取父节点
     */
    async getParent() {
        if (!this.parent_id) {
            return null;
        }

        try {
            return await DocumentNode.findById(this.parent_id);
        } catch (error) {
            logger.error('获取父节点失败', {
                nodeId: this.id,
                parentId: this.parent_id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取完整的路径
     */
    async getFullPath() {
        try {
            const path = [];
            let currentNode = this;

            while (currentNode) {
                path.unshift(currentNode.name);
                if (currentNode.parent_id) {
                    currentNode = await DocumentNode.findById(currentNode.parent_id);
                } else {
                    break;
                }
            }

            return path.join('/');
        } catch (error) {
            logger.error('获取完整路径失败', {
                nodeId: this.id,
                error: error.message
            });
            return this.name;
        }
    }

    /**
     * 更新节点内容
     */
    async updateContent(content, metadata = null) {
        try {
            const updateData = { content };

            if (metadata) {
                updateData.metadata = JSON.stringify({ ...this.metadata, ...metadata });
            }

            await DatabaseHelper.update('document_nodes', updateData, 'id = ?', [this.id]);

            if (content) {
                this.content = content;
            }
            if (metadata) {
                this.metadata = { ...this.metadata, ...metadata };
            }

            logger.debug('文档节点内容更新', {
                nodeId: this.id,
                name: this.name,
                contentType: typeof content
            });
        } catch (error) {
            logger.error('更新文档节点内容失败', {
                nodeId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 更新节点元数据
     */
    async updateMetadata(metadata) {
        try {
            const newMetadata = { ...this.metadata, ...metadata };
            await DatabaseHelper.update(
                'document_nodes',
                { metadata: JSON.stringify(newMetadata) },
                'id = ?',
                [this.id]
            );

            this.metadata = newMetadata;

            logger.debug('文档节点元数据更新', {
                nodeId: this.id,
                name: this.name,
                metadataKeys: Object.keys(metadata)
            });
        } catch (error) {
            logger.error('更新文档节点元数据失败', {
                nodeId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 移动节点到新的父节点
     */
    async moveTo(newParentId, newSortOrder = null) {
        try {
            const updateData = { parent_id: newParentId };

            // 计算新的层级
            if (newParentId) {
                const newParent = await DocumentNode.findById(newParentId);
                updateData.level = newParent.level + 1;
            } else {
                updateData.level = 0;
            }

            if (newSortOrder !== null) {
                updateData.sort_order = newSortOrder;
            }

            await DatabaseHelper.update('document_nodes', updateData, 'id = ?', [this.id]);

            this.parent_id = newParentId;
            this.level = updateData.level;
            if (newSortOrder !== null) {
                this.sort_order = newSortOrder;
            }

            logger.info('文档节点移动成功', {
                nodeId: this.id,
                name: this.name,
                oldParentId: this.parent_id,
                newParentId,
                newLevel: updateData.level
            });
        } catch (error) {
            logger.error('移动文档节点失败', {
                nodeId: this.id,
                newParentId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 删除文档节点
     */
    async delete() {
        try {
            // 递归删除子节点
            const children = await this.getChildren();
            for (const child of children) {
                await child.delete();
            }

            // 删除节点本身
            const result = await DatabaseHelper.delete('document_nodes', 'id = ?', [this.id]);
            if (result.changes === 0) {
                throw new NotFoundError('文档节点');
            }

            logger.info('文档节点删除成功', {
                nodeId: this.id,
                name: this.name,
                type: this.node_type
            });
        } catch (error) {
            logger.error('删除文档节点失败', {
                nodeId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 构建文档树结构
     */
    static async buildTree(projectId, options = {}) {
        const { maxDepth = 10, includeContent = false } = options;

        try {
            const allNodes = await DocumentNode.findByProject(projectId, {
                includeContent
            });

            const nodeMap = new Map();
            const rootNodes = [];

            // 创建节点映射
            for (const node of allNodes) {
                nodeMap.set(node.id, {
                    ...node.toJSON(),
                    children: []
                });
            }

            // 构建树结构
            for (const node of allNodes) {
                const nodeData = nodeMap.get(node.id);

                if (node.parent_id && nodeMap.has(node.parent_id)) {
                    const parent = nodeMap.get(node.parent_id);
                    parent.children.push(nodeData);
                } else {
                    rootNodes.push(nodeData);
                }
            }

            return rootNodes;
        } catch (error) {
            logger.error('构建文档树失败', {
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取节点摘要信息
     */
    getSummary() {
        return {
            id: this.id,
            project_id: this.project_id,
            file_id: this.file_id,
            node_type: this.node_type,
            name: this.name,
            relative_path: this.relative_path,
            parent_id: this.parent_id,
            level: this.level,
            sort_order: this.sort_order
        };
    }

    /**
     * 获取节点详细信息
     */
    getDetails() {
        return {
            id: this.id,
            project_id: this.project_id,
            file_id: this.file_id,
            node_type: this.node_type,
            name: this.name,
            relative_path: this.relative_path,
            content: this.content,
            metadata: this.metadata,
            parent_id: this.parent_id,
            level: this.level,
            sort_order: this.sort_order,
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

module.exports = DocumentNode;
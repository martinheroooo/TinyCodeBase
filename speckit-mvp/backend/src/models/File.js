/**
 * 文件数据模型
 *
 * 功能：
 * - 文件数据操作封装
 * - 文件状态管理
 * - 文件元数据处理
 */

const { DatabaseHelper } = require('../utils/database');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');
const { fileManager } = require('../utils/fileManager');

class File {
    constructor(data = {}) {
        this.id = data.id;
        this.project_id = data.project_id;
        this.relative_path = data.relative_path;
        this.absolute_path = data.absolute_path;
        this.file_name = data.file_name;
        this.file_extension = data.file_extension;
        this.file_size = data.file_size;
        this.language = data.language;
        this.encoding = data.encoding || 'utf-8';
        this.last_modified = data.last_modified;
        this.content_hash = data.content_hash;
        this.status = data.status || 'pending'; // 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
        this.error_message = data.error_message;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    /**
     * 创建文件记录
     */
    static async create(data) {
        try {
            // 验证必填字段
            if (!data.project_id || !data.relative_path || !data.absolute_path) {
                throw new ValidationError('项目ID、相对路径和绝对路径为必填项');
            }

            // 检查文件是否已存在
            const existingFile = await DatabaseHelper.find(
                'files',
                'project_id = ? AND relative_path = ?',
                [data.project_id, data.relative_path]
            );

            if (existingFile.length > 0) {
                return new File(existingFile[0]);
            }

            // 获取文件信息
            const fileInfo = await fileManager.getFileInfo(data.absolute_path);
            const fileExtension = require('path').extname(fileInfo.path).toLowerCase();
            const language = File.detectLanguage(fileExtension, fileInfo.path);

            // 插入文件记录
            const result = await DatabaseHelper.insert('files', {
                project_id: data.project_id,
                relative_path: data.relative_path,
                absolute_path: data.absolute_path,
                file_name: require('path').basename(fileInfo.path),
                file_extension: fileExtension,
                file_size: fileInfo.size,
                language: language,
                encoding: await fileManager.detectEncoding(data.absolute_path),
                last_modified: fileInfo.modified,
                content_hash: await fileManager.getFileHash(data.absolute_path),
                status: 'pending'
            });

            const file = await File.findById(result.id);
            logger.info('文件记录创建成功', {
                fileId: file.id,
                projectId: file.project_id,
                relativePath: file.relative_path,
                language: file.language
            });

            return file;
        } catch (error) {
            logger.error('创建文件记录失败', { error: error.message, data });
            throw error;
        }
    }

    /**
     * 根据ID查找文件
     */
    static async findById(id) {
        try {
            const data = await DatabaseHelper.findById('files', id);
            if (!data) {
                throw new NotFoundError('文件');
            }

            return new File(data);
        } catch (error) {
            logger.error('查找文件失败', { fileId: id, error: error.message });
            throw error;
        }
    }

    /**
     * 根据项目ID和相对路径查找文件
     */
    static async findByPath(projectId, relativePath) {
        try {
            const data = await DatabaseHelper.find(
                'files',
                'project_id = ? AND relative_path = ?',
                [projectId, relativePath]
            );

            if (data.length === 0) {
                throw new NotFoundError('文件');
            }

            return new File(data[0]);
        } catch (error) {
            logger.error('根据路径查找文件失败', {
                projectId,
                relativePath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取项目文件列表
     */
    static async findByProject(projectId, options = {}) {
        const { status = null, language = null, limit = 1000, offset = 0 } = options;

        try {
            let where = 'project_id = ?';
            let params = [projectId];

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

            return filesData.map(data => new File(data));
        } catch (error) {
            logger.error('获取项目文件列表失败', {
                projectId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 检测文件语言
     */
    static detectLanguage(extension, filePath) {
        const extensionMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.mjs': 'javascript',
            '.cjs': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.vue': 'vue',
            '.svelte': 'svelte',
            '.py': 'python',
            '.pyx': 'python',
            '.pyi': 'python',
            '.java': 'java',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.clj': 'clojure',
            '.go': 'go',
            '.rs': 'rust',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.h': 'c',
            '.hpp': 'cpp',
            '.cs': 'csharp',
            '.vb': 'visualbasic',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.dart': 'dart',
            '.html': 'html',
            '.htm': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.toml': 'toml',
            '.ini': 'ini',
            '.cfg': 'ini',
            '.md': 'markdown',
            '.txt': 'text',
            '.rst': 'restructuredtext',
            '.adoc': 'asciidoc',
            '.sql': 'sql',
            '.sh': 'shell',
            '.bash': 'shell',
            '.zsh': 'shell',
            '.fish': 'shell',
            '.ps1': 'powershell',
            '.xml': 'xml',
            '.svg': 'xml',
            '.dockerfile': 'dockerfile'
        };

        // 特殊文件名检测
        const fileName = require('path').basename(filePath).toLowerCase();
        const fileNameMap = {
            'dockerfile': 'dockerfile',
            'makefile': 'makefile',
            'rakefile': 'ruby',
            'gemfile': 'ruby',
            'package.json': 'json',
            'requirements.txt': 'pip',
            'pipfile': 'pip',
            'cargo.toml': 'rust',
            'tsconfig.json': 'json',
            '.gitignore': 'git',
            '.gitattributes': 'git',
            '.editorconfig': 'editorconfig',
            '.eslintrc': 'json',
            '.prettierrc': 'json',
            'babel.config.js': 'javascript'
        };

        return fileNameMap[fileName] || extensionMap[extension] || 'text';
    }

    /**
     * 更新文件状态
     */
    async updateStatus(status, errorMessage = null) {
        try {
            const validStatuses = ['pending', 'processing', 'completed', 'failed', 'skipped'];
            if (!validStatuses.includes(status)) {
                throw new ValidationError('无效的文件状态');
            }

            const updateData = { status };

            if (status === 'failed' && errorMessage) {
                updateData.error_message = errorMessage;
            }

            await DatabaseHelper.update('files', updateData, 'id = ?', [this.id]);
            this.status = status;

            if (errorMessage) {
                this.error_message = errorMessage;
            }

            logger.debug('文件状态更新', {
                fileId: this.id,
                relativePath: this.relative_path,
                status,
                errorMessage
            });
        } catch (error) {
            logger.error('更新文件状态失败', {
                fileId: this.id,
                status,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 读取文件内容
     */
    async readContent() {
        try {
            if (!await fileManager.fileExists(this.absolute_path)) {
                throw new NotFoundError('文件');
            }

            const content = await fileManager.readFile(this.absolute_path, this.encoding);
            return content;
        } catch (error) {
            logger.error('读取文件内容失败', {
                fileId: this.id,
                absolutePath: this.absolute_path,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取文件统计信息
     */
    async getStats() {
        try {
            const content = await this.readContent();
            const lines = content.split('\n').length;
            const characters = content.length;
            const words = content.split(/\s+/).filter(word => word.length > 0).length;

            // 简单的代码行数统计
            const codeLines = content.split('\n').filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
            }).length;

            return {
                lines,
                codeLines,
                commentLines: lines - codeLines,
                characters,
                words,
                size: this.file_size
            };
        } catch (error) {
            logger.error('获取文件统计信息失败', {
                fileId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 删除文件记录
     */
    async delete() {
        try {
            const result = await DatabaseHelper.delete('files', 'id = ?', [this.id]);
            if (result.changes === 0) {
                throw new NotFoundError('文件');
            }

            logger.info('文件记录删除成功', {
                fileId: this.id,
                relativePath: this.relative_path
            });
        } catch (error) {
            logger.error('删除文件记录失败', {
                fileId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 获取文件的文档节点
     */
    async getDocumentNodes() {
        try {
            const nodesData = await DatabaseHelper.find(
                'document_nodes',
                'file_id = ?',
                [this.id],
                'sort_order ASC, name ASC'
            );

            return nodesData;
        } catch (error) {
            logger.error('获取文件文档节点失败', {
                fileId: this.id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 检查文件是否已被修改
     */
    async isModified() {
        try {
            if (!await fileManager.fileExists(this.absolute_path)) {
                return true; // 文件不存在视为已修改
            }

            const currentHash = await fileManager.getFileHash(this.absolute_path);
            return currentHash !== this.content_hash;
        } catch (error) {
            logger.error('检查文件修改状态失败', {
                fileId: this.id,
                error: error.message
            });
            return true; // 出错时保守处理，认为已修改
        }
    }

    /**
     * 获取文件摘要信息
     */
    getSummary() {
        return {
            id: this.id,
            project_id: this.project_id,
            relative_path: this.relative_path,
            file_name: this.file_name,
            file_extension: this.file_extension,
            language: this.language,
            file_size: this.file_size,
            status: this.status,
            last_modified: this.last_modified
        };
    }

    /**
     * 获取文件详细信息
     */
    getDetails() {
        return {
            id: this.id,
            project_id: this.project_id,
            relative_path: this.relative_path,
            absolute_path: this.absolute_path,
            file_name: this.file_name,
            file_extension: this.file_extension,
            file_size: this.file_size,
            language: this.language,
            encoding: this.encoding,
            last_modified: this.last_modified,
            content_hash: this.content_hash,
            status: this.status,
            error_message: this.error_message,
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

module.exports = File;
/**
 * 文件管理工具模块
 *
 * 功能：
 * - 文件上传处理
 * - 临时文件管理
 * - 文件清理和归档
 * - 文件安全检查
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { logger } = require('./logger');
const { ValidationError, ExternalServiceError } = require('./errorHandler');

class FileManager {
    constructor() {
        this.tempDir = process.env.TEMP_DIR || './temp';
        this.exportDir = process.env.EXPORT_DIR || './exports';
        this.maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB) || 100) * 1024 * 1024;
        this.allowedExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
            '.py', '.pyx', '.pyi',
            '.java', '.kt', '.scala', '.clj',
            '.go', '.rs', '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
            '.cs', '.vb', '.php', '.rb', '.swift', '.dart',
            '.html', '.htm', '.css', '.scss', '.sass', '.less',
            '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
            '.md', '.txt', '.rst', '.adoc',
            '.sql', '.sh', '.bash', '.zsh', '.fish', '.ps1',
            '.xml', '.svg', '.dockerfile', 'Dockerfile',
            '.gitignore', '.gitattributes', '.editorconfig',
            '.eslintrc', '.prettierrc', '.babelrc', 'tsconfig.json',
            'package.json', 'requirements.txt', 'Pipfile', 'Cargo.toml'
        ];
        this.excludedPatterns = [
            /node_modules/,
            /\.git/,
            /\.svn/,
            /\.hg/,
            /__pycache__/,
            /target/,
            /build/,
            /dist/,
            /\.vscode/,
            /\.idea/,
            /logs/,
            /temp/,
            /\.log$/,
            /\.tmp$/,
            /\.cache$/,
            /.*\.min\.js$/,
            /.*\.map$/,
            /.*\.d\.ts$/
        ];
    }

    /**
     * 初始化文件管理器
     */
    async initialize() {
        try {
            // 确保必要目录存在
            await this.ensureDirectory(this.tempDir);
            await this.ensureDirectory(this.exportDir);
            await this.ensureDirectory(path.join(this.tempDir, 'uploads'));
            await this.ensureDirectory(path.join(this.tempDir, 'processing'));
            await this.ensureDirectory(path.join(this.tempDir, 'cache'));

            // 启动定时清理任务
            this.startCleanupTask();

            logger.info('文件管理器初始化完成', {
                tempDir: this.tempDir,
                exportDir: this.exportDir,
                maxFileSize: this.maxFileSize
            });
        } catch (error) {
            logger.error('文件管理器初始化失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 确保目录存在
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
            logger.debug('创建目录', { path: dirPath });
        }
    }

    /**
     * 生成唯一文件名
     */
    generateUniqueFileName(originalName, prefix = '') {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        const ext = path.extname(originalName);
        const name = path.basename(originalName, ext);
        const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');

        return `${prefix}${timestamp}_${random}_${sanitizedName}${ext}`;
    }

    /**
     * 验证文件
     */
    validateFile(file) {
        // 检查文件大小
        if (file.size > this.maxFileSize) {
            throw new ValidationError(`文件大小超过限制 (${this.maxFileSize / 1024 / 1024}MB)`);
        }

        // 检查文件扩展名
        const ext = path.extname(file.originalname).toLowerCase();
        if (!this.allowedExtensions.includes(ext)) {
            throw new ValidationError(`不支持的文件类型: ${ext}`);
        }

        // 检查文件名
        const sanitizedName = path.basename(file.originalname);
        if (sanitizedName.includes('..') || sanitizedName.includes('/') || sanitizedName.includes('\\')) {
            throw new ValidationError('文件名包含非法字符');
        }

        return true;
    }

    /**
     * 创建multer存储配置
     */
    createMulterStorage(destination = 'uploads') {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(this.tempDir, destination);
                this.ensureDirectory(uploadPath).then(() => {
                    cb(null, uploadPath);
                }).catch(cb);
            },
            filename: (req, file, cb) => {
                const uniqueName = this.generateUniqueFileName(file.originalname, 'upload_');
                cb(null, uniqueName);
            }
        });

        return multer({
            storage,
            limits: {
                fileSize: this.maxFileSize,
                files: 10
            },
            fileFilter: (req, file, cb) => {
                try {
                    this.validateFile(file);
                    cb(null, true);
                } catch (error) {
                    cb(error);
                }
            }
        });
    }

    /**
     * 创建临时文件
     */
    async createTempFile(content, filename, prefix = 'temp_') {
        const uniqueName = this.generateUniqueFileName(filename, prefix);
        const filePath = path.join(this.tempDir, uniqueName);

        try {
            await fs.writeFile(filePath, content, 'utf8');
            logger.debug('创建临时文件', { path: filePath, size: content.length });
            return { path: filePath, name: uniqueName };
        } catch (error) {
            logger.error('创建临时文件失败', { path: filePath, error: error.message });
            throw new ExternalServiceError('文件系统', '创建临时文件失败', error);
        }
    }

    /**
     * 读取文件
     */
    async readFile(filePath, encoding = 'utf8') {
        try {
            const content = await fs.readFile(filePath, encoding);
            return content;
        } catch (error) {
            logger.error('读取文件失败', { path: filePath, error: error.message });
            throw new ExternalServiceError('文件系统', '读取文件失败', error);
        }
    }

    /**
     * 写入文件
     */
    async writeFile(filePath, content, encoding = 'utf8') {
        try {
            await fs.writeFile(filePath, content, encoding);
            logger.debug('写入文件', { path: filePath, size: content.length });
        } catch (error) {
            logger.error('写入文件失败', { path: filePath, error: error.message });
            throw new ExternalServiceError('文件系统', '写入文件失败', error);
        }
    }

    /**
     * 复制文件
     */
    async copyFile(sourcePath, destPath) {
        try {
            await fs.copyFile(sourcePath, destPath);
            logger.debug('复制文件', { from: sourcePath, to: destPath });
        } catch (error) {
            logger.error('复制文件失败', { from: sourcePath, to: destPath, error: error.message });
            throw new ExternalServiceError('文件系统', '复制文件失败', error);
        }
    }

    /**
     * 移动文件
     */
    async moveFile(sourcePath, destPath) {
        try {
            await fs.rename(sourcePath, destPath);
            logger.debug('移动文件', { from: sourcePath, to: destPath });
        } catch (error) {
            logger.error('移动文件失败', { from: sourcePath, to: destPath, error: error.message });
            throw new ExternalServiceError('文件系统', '移动文件失败', error);
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            logger.debug('删除文件', { path: filePath });
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('删除文件失败', { path: filePath, error: error.message });
                throw new ExternalServiceError('文件系统', '删除文件失败', error);
            }
        }
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取文件信息
     */
    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return {
                path: filePath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                accessed: stats.atime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            logger.error('获取文件信息失败', { path: filePath, error: error.message });
            throw new ExternalServiceError('文件系统', '获取文件信息失败', error);
        }
    }

    /**
     * 扫描目录
     */
    async scanDirectory(dirPath, options = {}) {
        const {
            recursive = true,
            includeHidden = false,
            maxDepth = 10,
            filter = null
        } = options;

        const results = [];

        try {
            await this._scanDirectoryRecursive(dirPath, results, {
                recursive,
                includeHidden,
                currentDepth: 0,
                maxDepth,
                filter,
                baseDir: dirPath
            });

            return results;
        } catch (error) {
            logger.error('扫描目录失败', { path: dirPath, error: error.message });
            throw new ExternalServiceError('文件系统', '扫描目录失败', error);
        }
    }

    /**
     * 递归扫描目录
     */
    async _scanDirectoryRecursive(dirPath, results, options) {
        const {
            recursive,
            includeHidden,
            currentDepth,
            maxDepth,
            filter,
            baseDir
        } = options;

        if (currentDepth >= maxDepth) {
            return;
        }

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(baseDir, fullPath);

                // 跳过隐藏文件
                if (!includeHidden && entry.name.startsWith('.')) {
                    continue;
                }

                // 跳过排除的模式
                if (this.excludedPatterns.some(pattern => pattern.test(relativePath))) {
                    continue;
                }

                const fileInfo = {
                    name: entry.name,
                    path: fullPath,
                    relativePath,
                    isDirectory: entry.isDirectory(),
                    isFile: entry.isFile()
                };

                // 如果是文件，获取额外信息
                if (entry.isFile()) {
                    const stats = await fs.stat(fullPath);
                    fileInfo.size = stats.size;
                    fileInfo.extension = path.extname(entry.name).toLowerCase();
                    fileInfo.modified = stats.mtime;

                    // 应用过滤器
                    if (filter && !filter(fileInfo)) {
                        continue;
                    }
                }

                results.push(fileInfo);

                // 递归处理子目录
                if (recursive && entry.isDirectory()) {
                    await this._scanDirectoryRecursive(fullPath, results, {
                        ...options,
                        currentDepth: currentDepth + 1
                    });
                }
            }
        } catch (error) {
            logger.warn('扫描目录条目失败', { path: dirPath, error: error.message });
        }
    }

    /**
     * 创建压缩包
     */
    async createArchive(sourcePath, archivePath, format = 'zip') {
        // 这里可以集成archiver或其他压缩库
        // 临时实现，仅复制文件
        try {
            if (fsSync.statSync(sourcePath).isDirectory()) {
                await this.copyDirectory(sourcePath, archivePath);
            } else {
                await this.copyFile(sourcePath, archivePath);
            }
            logger.info('创建归档文件', { source: sourcePath, archive: archivePath });
        } catch (error) {
            logger.error('创建归档文件失败', { source: sourcePath, archive: archivePath, error: error.message });
            throw new ExternalServiceError('文件系统', '创建归档文件失败', error);
        }
    }

    /**
     * 复制目录
     */
    async copyDirectory(sourcePath, destPath) {
        await this.ensureDirectory(destPath);
        const entries = await fs.readdir(sourcePath, { withFileTypes: true });

        for (const entry of entries) {
            const sourceEntryPath = path.join(sourcePath, entry.name);
            const destEntryPath = path.join(destPath, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(sourceEntryPath, destEntryPath);
            } else {
                await this.copyFile(sourceEntryPath, destEntryPath);
            }
        }
    }

    /**
     * 清理临时文件
     */
    async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
        try {
            const now = Date.now();
            const entries = await fs.readdir(this.tempDir, { withFileTypes: true });

            let cleanedCount = 0;
            let cleanedSize = 0;

            for (const entry of entries) {
                const entryPath = path.join(this.tempDir, entry.name);
                const stats = await fs.stat(entryPath);

                if (now - stats.mtime.getTime() > maxAge) {
                    const size = stats.isDirectory() ? await this._getDirectorySize(entryPath) : stats.size;

                    if (stats.isDirectory()) {
                        await this._deleteDirectory(entryPath);
                    } else {
                        await fs.unlink(entryPath);
                    }

                    cleanedCount++;
                    cleanedSize += size;
                    logger.debug('清理临时文件', { path: entryPath, size });
                }
            }

            if (cleanedCount > 0) {
                logger.info('临时文件清理完成', {
                    count: cleanedCount,
                    size: `${(cleanedSize / 1024 / 1024).toFixed(2)}MB`
                });
            }
        } catch (error) {
            logger.error('清理临时文件失败', { error: error.message });
        }
    }

    /**
     * 获取目录大小
     */
    async _getDirectorySize(dirPath) {
        let totalSize = 0;
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            const stats = await fs.stat(entryPath);

            if (stats.isDirectory()) {
                totalSize += await this._getDirectorySize(entryPath);
            } else {
                totalSize += stats.size;
            }
        }

        return totalSize;
    }

    /**
     * 删除目录
     */
    async _deleteDirectory(dirPath) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                await this._deleteDirectory(entryPath);
            } else {
                await fs.unlink(entryPath);
            }
        }

        await fs.rmdir(dirPath);
    }

    /**
     * 启动清理任务
     */
    startCleanupTask() {
        // 每小时清理一次临时文件
        setInterval(() => {
            this.cleanupTempFiles();
        }, 60 * 60 * 1000);

        logger.info('定时清理任务已启动');
    }

    /**
     * 获取文件哈希
     */
    async getFileHash(filePath, algorithm = 'sha256') {
        try {
            const content = await fs.readFile(filePath);
            const hash = crypto.createHash(algorithm).update(content).digest('hex');
            return hash;
        } catch (error) {
            logger.error('计算文件哈希失败', { path: filePath, error: error.message });
            throw new ExternalServiceError('文件系统', '计算文件哈希失败', error);
        }
    }

    /**
     * 检测文件编码
     */
    async detectEncoding(filePath) {
        try {
            // 简单的编码检测，可以集成jschardet等库
            const buffer = await fs.readFile(filePath);
            const content = buffer.toString('utf8');

            // 如果包含乱码字符，尝试其他编码
            if (content.includes('�')) {
                return 'binary'; // 或者其他编码
            }

            return 'utf8';
        } catch (error) {
            logger.error('检测文件编码失败', { path: filePath, error: error.message });
            return 'utf8'; // 默认返回utf8
        }
    }
}

// 创建单例实例
const fileManager = new FileManager();

module.exports = { FileManager, fileManager };
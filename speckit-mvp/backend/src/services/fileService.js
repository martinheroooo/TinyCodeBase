/**
 * 文件分析服务
 *
 * 功能：
 * - 文件元数据提取
 * - 文件内容分析
 * - 代码结构识别
 * - 项目统计信息生成
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { fileManager } = require('../utils/fileManager');
const File = require('../models/File');
const DocumentNode = require('../models/DocumentNode');
const {
    ExternalServiceError,
    ValidationError
} = require('../utils/errorHandler');

class FileService {
    constructor() {
        this.supportedLanguages = [
            'javascript', 'typescript', 'python', 'java', 'go', 'rust',
            'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin',
            'html', 'css', 'scss', 'less', 'json', 'yaml', 'xml',
            'markdown', 'sql', 'shell', 'dockerfile'
        ];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
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
            /coverage/,
            /\.nyc_output/,
            /logs/,
            /temp/,
            /\.tmp/
        ];
    }

    /**
     * 分析项目文件
     */
    async analyzeProjectFiles(projectId, projectPath, options = {}) {
        try {
            logger.info('开始分析项目文件', {
                projectId,
                projectPath,
                options
            });

            const analysisResult = {
                totalFiles: 0,
                codeFiles: 0,
                textFiles: 0,
                binaryFiles: 0,
                totalSize: 0,
                languages: {},
                fileTypes: {},
                largestFiles: [],
                newestFiles: [],
                oldestFiles: [],
                directoryStructure: {},
                processingErrors: []
            };

            // 扫描项目文件
            const files = await fileManager.scanDirectory(projectPath, {
                recursive: true,
                includeHidden: false,
                maxDepth: options.maxDepth || 10,
                filter: (fileInfo) => !this._shouldExcludeFile(fileInfo.relativePath)
            });

            logger.info('扫描到文件数量', { count: files.length });

            // 分析每个文件
            const fileRecords = [];
            for (let i = 0; i < files.length; i++) {
                const fileInfo = files[i];
                const absolutePath = path.join(projectPath, fileInfo.relativePath);

                try {
                    // 更新进度（这里可以集成进度回调）
                    if (i % 100 === 0) {
                        logger.debug('文件分析进度', {
                            current: i,
                            total: files.length,
                            percentage: Math.round((i / files.length) * 100)
                        });
                    }

                    // 分析文件
                    const fileAnalysis = await this._analyzeFile(absolutePath, fileInfo);
                    if (fileAnalysis) {
                        fileRecords.push(fileAnalysis);
                        this._updateAnalysisResult(analysisResult, fileAnalysis);
                    }
                } catch (error) {
                    logger.warn('文件分析失败', {
                        filePath: fileInfo.relativePath,
                        error: error.message
                    });
                    analysisResult.processingErrors.push({
                        file: fileInfo.relativePath,
                        error: error.message
                    });
                }
            }

            // 生成目录结构
            analysisResult.directoryStructure = this._generateDirectoryStructure(fileRecords);

            // 计算统计信息
            this._calculateStatistics(analysisResult);

            logger.info('项目文件分析完成', {
                projectId,
                totalFiles: analysisResult.totalFiles,
                codeFiles: analysisResult.codeFiles,
                languages: Object.keys(analysisResult.languages).length,
                processingErrors: analysisResult.processingErrors.length
            });

            return {
                success: true,
                projectId,
                analysisResult,
                fileRecords
            };
        } catch (error) {
            logger.error('项目文件分析失败', {
                projectId,
                projectPath,
                error: error.message
            });
            throw new ExternalServiceError('文件分析', '项目文件分析失败', error);
        }
    }

    /**
     * 分析单个文件
     */
    async _analyzeFile(absolutePath, fileInfo) {
        try {
            // 获取文件基本信息
            const fileStats = await fileManager.getFileInfo(absolutePath);
            const language = File.detectLanguage(fileStats.extension, fileStats.path);
            const encoding = await fileManager.detectEncoding(absolutePath);
            const contentHash = await fileManager.getFileHash(absolutePath);

            // 判断是否为二进制文件
            const isBinary = await this._isBinaryFile(absolutePath, encoding);

            let content = null;
            let lineCount = 0;
            let codeMetrics = null;

            // 只分析文本文件和代码文件
            if (!isBinary && fileStats.size < this.maxFileSize) {
                try {
                    content = await fileManager.readFile(absolutePath, encoding);
                    lineCount = content.split('\n').length;

                    // 如果是代码文件，进行代码分析
                    if (this.supportedLanguages.includes(language)) {
                        codeMetrics = await this._analyzeCodeContent(content, language);
                    }
                } catch (readError) {
                    logger.warn('读取文件内容失败', {
                        filePath: fileInfo.relativePath,
                        error: readError.message
                    });
                }
            }

            // 创建文件记录
            const fileRecord = {
                project_id: null, // 将在调用处设置
                relative_path: fileInfo.relativePath,
                absolute_path: absolutePath,
                file_name: fileInfo.name,
                file_extension: fileInfo.extension,
                file_size: fileStats.size,
                language: language,
                encoding: encoding,
                last_modified: fileStats.modified,
                content_hash: contentHash,
                is_binary: isBinary,
                line_count: lineCount,
                status: 'completed',
                metadata: {
                    codeMetrics,
                    analysisTime: new Date().toISOString()
                }
            };

            return fileRecord;
        } catch (error) {
            logger.error('文件分析失败', {
                filePath: fileInfo.relativePath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 分析代码内容
     */
    async _analyzeCodeContent(content, language) {
        try {
            const metrics = {
                functions: [],
                classes: [],
                imports: [],
                exports: [],
                variables: [],
                comments: [],
                complexity: 0,
                linesOfCode: 0,
                linesOfComments: 0,
                linesOfBlank: 0
            };

            const lines = content.split('\n');

            // 基本行数统计
            metrics.linesOfCode = lines.filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 0 && !this._isCommentLine(trimmed, language);
            }).length;

            metrics.linesOfComments = lines.filter(line =>
                this._isCommentLine(line.trim(), language)
            ).length;

            metrics.linesOfBlank = lines.filter(line =>
                line.trim().length === 0
            ).length;

            // 根据语言进行特定分析
            switch (language) {
                case 'javascript':
                case 'typescript':
                    this._analyzeJavaScriptContent(content, metrics);
                    break;
                case 'python':
                    this._analyzePythonContent(content, metrics);
                    break;
                case 'java':
                    this._analyzeJavaContent(content, metrics);
                    break;
                case 'go':
                    this._analyzeGoContent(content, metrics);
                    break;
                default:
                    this._analyzeGenericContent(content, metrics);
            }

            return metrics;
        } catch (error) {
            logger.warn('代码内容分析失败', {
                language,
                error: error.message
            });
            return null;
        }
    }

    /**
     * 分析JavaScript/TypeScript内容
     */
    _analyzeJavaScriptContent(content, metrics) {
        // 函数匹配
        const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|(\w+)\s*:\s*function|async\s+(\w+)\s*\([^)]*\))/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2] || match[3] || match[4];
            if (functionName) {
                metrics.functions.push({
                    name: functionName,
                    line: content.substring(0, match.index).split('\n').length
                });
            }
        }

        // 类匹配
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(content)) !== null) {
            metrics.classes.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // Import匹配
        const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
        while ((match = importRegex.exec(content)) !== null) {
            metrics.imports.push({
                module: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // Export匹配
        const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
        while ((match = exportRegex.exec(content)) !== null) {
            metrics.exports.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // 简单复杂度计算
        metrics.complexity = this._calculateComplexity(content, 'javascript');
    }

    /**
     * 分析Python内容
     */
    _analyzePythonContent(content, metrics) {
        // 函数匹配
        const functionRegex = /def\s+(\w+)\s*\([^)]*\)/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            metrics.functions.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // 类匹配
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(content)) !== null) {
            metrics.classes.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // Import匹配
        const importRegex = /(?:from\s+(\S+)\s+)?import\s+(.+)/g;
        while ((match = importRegex.exec(content)) !== null) {
            metrics.imports.push({
                module: match[1] || match[2],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        metrics.complexity = this._calculateComplexity(content, 'python');
    }

    /**
     * 分析Java内容
     */
    _analyzeJavaContent(content, metrics) {
        // 方法匹配
        const methodRegex = /(?:public|private|protected)?\s*(?:static)?\s*(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w\s,]+)?\s*\{/g;
        let match;
        while ((match = methodRegex.exec(content)) !== null) {
            metrics.functions.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // 类匹配
        const classRegex = /(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/g;
        while ((match = classRegex.exec(content)) !== null) {
            metrics.classes.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // Import匹配
        const importRegex = /import\s+([^;]+);/g;
        while ((match = importRegex.exec(content)) !== null) {
            metrics.imports.push({
                module: match[1].trim(),
                line: content.substring(0, match.index).split('\n').length
            });
        }

        metrics.complexity = this._calculateComplexity(content, 'java');
    }

    /**
     * 分析Go内容
     */
    _analyzeGoContent(content, metrics) {
        // 函数匹配
        const functionRegex = /func\s+(?:\([^)]*\)\s*)?(\w+)\s*\([^)]*\)/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            metrics.functions.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // Import匹配
        const importRegex = /import\s+(?:\([^)]+\)|"[^"]+")/g;
        while ((match = importRegex.exec(content)) !== null) {
            metrics.imports.push({
                module: match[0],
                line: content.substring(0, match.index).split('\n').length
            });
        }

        metrics.complexity = this._calculateComplexity(content, 'go');
    }

    /**
     * 通用内容分析
     */
    _analyzeGenericContent(content, metrics) {
        // 基本的函数匹配模式
        const genericFunctionRegex = /(?:function|def|func)\s+(\w+)/g;
        let match;
        while ((match = genericFunctionRegex.exec(content)) !== null) {
            metrics.functions.push({
                name: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }
    }

    /**
     * 计算代码复杂度
     */
    _calculateComplexity(content, language) {
        let complexity = 0;

        // 根据不同的复杂度模式进行计算
        const complexityPatterns = {
            javascript: [
                /if\s*\(/g,
                /else\s+if\s*\(/g,
                /for\s*\(/g,
                /while\s*\(/g,
                /do\s*{/g,
                /switch\s*\(/g,
                /case\s+/g,
                /catch\s*\(/g,
                /&&/g,
                /\|\|/g
            ],
            python: [
                /if\s+/g,
                /elif\s+/g,
                /for\s+/g,
                /while\s+/g,
                /except\s+/g,
                /case\s+/g,
                /and\s+/g,
                /or\s+/g
            ],
            java: [
                /if\s*\(/g,
                /else\s+if\s*\(/g,
                /for\s*\(/g,
                /while\s*\(/g,
                /do\s*{/g,
                /switch\s*\(/g,
                /case\s+/g,
                /catch\s*\(/g,
                /&&/g,
                /\|\|/g
            ],
            go: [
                /if\s+/g,
                /else\s+if\s+/g,
                /for\s+/g,
                /switch\s+/g,
                /case\s+/g,
                /&&/g,
                /\|\|/g
            ]
        };

        const patterns = complexityPatterns[language] || complexityPatterns.javascript;

        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }

        return complexity;
    }

    /**
     * 判断是否为注释行
     */
    _isCommentLine(line, language) {
        const commentPatterns = {
            javascript: [/^\s*\/\//, /^\s*\/\*.*\*\/$/, /^\s*\*?/],
            typescript: [/^\s*\/\//, /^\s*\/\*.*\*\/$/, /^\s*\*?/],
            python: [/^\s*#/, /^\s*""""$/, /^\s*'''$/],
            java: [/^\s*\/\//, /^\s*\/\*.*\*\/$/, /^\s*\*?/],
            go: [/^\s*\/\//, /^\s*\/\*.*\*\/$/, /^\s*\*?/],
            css: [/^\s*\/\//, /^\s*\/\*.*\*\/$/],
            sql: [/^\s*--/],
            shell: [/^\s*#/],
            html: [/^\s*<!--/, /^\s*-->$/],
            xml: [/^\s*<!--/, /^\s*-->$/]
        };

        const patterns = commentPatterns[language] || commentPatterns.javascript;
        return patterns.some(pattern => pattern.test(line));
    }

    /**
     * 判断是否为二进制文件
     */
    async _isBinaryFile(filePath, encoding) {
        try {
            // 如果编码检测为binary，认为是二进制文件
            if (encoding === 'binary') {
                return true;
            }

            // 检查文件扩展名
            const ext = path.extname(filePath).toLowerCase();
            const binaryExtensions = [
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
                '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
                '.exe', '.dll', '.so', '.dylib',
                '.mp3', '.mp4', '.avi', '.mov', '.wav',
                '.ttf', '.otf', '.woff', '.woff2',
                '.sqlite', '.db', '.mdb'
            ];

            if (binaryExtensions.includes(ext)) {
                return true;
            }

            // 读取文件前几个字节进行检测
            const buffer = await fs.readFile(filePath, { encoding: null });
            const sample = buffer.slice(0, 1024);

            // 检查是否包含null字节（二进制文件的典型特征）
            if (sample.includes(0)) {
                return true;
            }

            // 检查不可打印字符的比例
            let nonPrintableCount = 0;
            for (let i = 0; i < sample.length; i++) {
                const byte = sample[i];
                if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
                    nonPrintableCount++;
                }
            }

            // 如果不可打印字符比例超过30%，认为是二进制文件
            return (nonPrintableCount / sample.length) > 0.3;
        } catch (error) {
            logger.warn('检测文件类型失败', {
                filePath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * 判断是否应该排除文件
     */
    _shouldExcludeFile(relativePath) {
        return this.excludedPatterns.some(pattern => pattern.test(relativePath));
    }

    /**
     * 更新分析结果
     */
    _updateAnalysisResult(analysisResult, fileAnalysis) {
        analysisResult.totalFiles++;
        analysisResult.totalSize += fileAnalysis.file_size;

        if (fileAnalysis.is_binary) {
            analysisResult.binaryFiles++;
        } else if (fileAnalysis.language === 'text') {
            analysisResult.textFiles++;
        } else {
            analysisResult.codeFiles++;
        }

        // 语言统计
        const language = fileAnalysis.language;
        if (!analysisResult.languages[language]) {
            analysisResult.languages[language] = {
                fileCount: 0,
                lineCount: 0,
                size: 0
            };
        }
        analysisResult.languages[language].fileCount++;
        analysisResult.languages[language].lineCount += fileAnalysis.line_count || 0;
        analysisResult.languages[language].size += fileAnalysis.file_size;

        // 文件类型统计
        const ext = fileAnalysis.file_extension || 'no_extension';
        if (!analysisResult.fileTypes[ext]) {
            analysisResult.fileTypes[ext] = 0;
        }
        analysisResult.fileTypes[ext]++;

        // 大文件记录
        if (fileAnalysis.file_size > 1024 * 1024) { // 大于1MB
            analysisResult.largestFiles.push({
                path: fileAnalysis.relative_path,
                size: fileAnalysis.file_size,
                name: fileAnalysis.file_name
            });
        }

        // 最新文件记录
        if (fileAnalysis.last_modified) {
            analysisResult.newestFiles.push({
                path: fileAnalysis.relative_path,
                modified: fileAnalysis.last_modified,
                name: fileAnalysis.file_name
            });
        }
    }

    /**
     * 生成目录结构
     */
    _generateDirectoryStructure(fileRecords) {
        const structure = {};

        for (const file of fileRecords) {
            const parts = file.relative_path.split(path.sep);
            let current = structure;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {
                        type: 'directory',
                        children: {}
                    };
                }
                current = current[part].children;
            }

            // 添加文件
            const fileName = parts[parts.length - 1];
            current[fileName] = {
                type: 'file',
                size: file.file_size,
                language: file.language,
                lineCount: file.line_count
            };
        }

        return structure;
    }

    /**
     * 计算最终统计信息
     */
    _calculateStatistics(analysisResult) {
        // 排序大文件
        analysisResult.largestFiles.sort((a, b) => b.size - a.size);
        analysisResult.largestFiles = analysisResult.largestFiles.slice(0, 10);

        // 排序最新文件
        analysisResult.newestFiles.sort((a, b) =>
            new Date(b.modified) - new Date(a.modified)
        );
        analysisResult.newestFiles = analysisResult.newestFiles.slice(0, 10);

        // 转换语言统计为数组并排序
        analysisResult.languages = Object.entries(analysisResult.languages)
            .map(([language, stats]) => ({
                name: language,
                ...stats,
                percentage: ((stats.fileCount / analysisResult.totalFiles) * 100).toFixed(2)
            }))
            .sort((a, b) => b.fileCount - a.fileCount);

        // 转换文件类型统计并排序
        analysisResult.fileTypes = Object.entries(analysisResult.fileTypes)
            .map(([extension, count]) => ({ extension, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * 创建文档节点
     */
    async createDocumentNodes(projectId, fileRecords) {
        try {
            logger.info('开始创建文档节点', { projectId, fileCount: fileRecords.length });

            const documentNodes = [];

            for (const fileRecord of fileRecords) {
                // 为每个代码文件创建文档节点
                if (!fileRecord.is_binary && fileRecord.language !== 'text') {
                    const fileNode = await DocumentNode.create({
                        project_id: projectId,
                        file_id: null, // 将在文件创建后设置
                        node_type: 'file',
                        name: fileRecord.file_name,
                        relative_path: fileRecord.relative_path,
                        content: fileRecord.metadata?.codeMetrics ?
                            JSON.stringify(fileRecord.metadata.codeMetrics) : null,
                        metadata: {
                            language: fileRecord.language,
                            lineCount: fileRecord.line_count,
                            fileSize: fileRecord.file_size
                        },
                        level: fileRecord.relative_path.split(path.sep).length - 1,
                        sort_order: 0
                    });

                    documentNodes.push(fileNode);

                    // 创建函数节点
                    if (fileRecord.metadata?.codeMetrics?.functions) {
                        for (const func of fileRecord.metadata.codeMetrics.functions) {
                            const functionNode = await DocumentNode.create({
                                project_id: projectId,
                                file_id: fileNode.id,
                                node_type: 'function',
                                name: func.name,
                                relative_path: `${fileRecord.relative_path}#${func.name}`,
                                content: null,
                                metadata: {
                                    line: func.line,
                                    type: 'function'
                                },
                                parent_id: fileNode.id,
                                level: fileNode.level + 1,
                                sort_order: func.line
                            });

                            documentNodes.push(functionNode);
                        }
                    }
                }
            }

            logger.info('文档节点创建完成', {
                projectId,
                totalNodes: documentNodes.length
            });

            return documentNodes;
        } catch (error) {
            logger.error('创建文档节点失败', {
                projectId,
                error: error.message
            });
            throw new ExternalServiceError('文档创建', '创建文档节点失败', error);
        }
    }

    /**
     * 获取文件内容摘要
     */
    async getFileSummary(absolutePath, maxLines = 50) {
        try {
            const stats = await fileManager.getFileInfo(absolutePath);
            const encoding = await fileManager.detectEncoding(absolutePath);

            if (stats.size > this.maxFileSize) {
                throw new ValidationError('文件过大，无法生成摘要');
            }

            const content = await fileManager.readFile(absolutePath, encoding);
            const lines = content.split('\n');
            const summary = lines.slice(0, maxLines).join('\n');

            return {
                success: true,
                totalLines: lines.length,
                summary,
                truncated: lines.length > maxLines
            };
        } catch (error) {
            logger.error('生成文件摘要失败', {
                absolutePath,
                error: error.message
            });
            throw new ExternalServiceError('文件分析', '生成文件摘要失败', error);
        }
    }
}

// 创建单例实例
const fileService = new FileService();

module.exports = { FileService, fileService };
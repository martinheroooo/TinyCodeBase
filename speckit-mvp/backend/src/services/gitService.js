/**
 * Git服务模块
 *
 * 功能：
 * - Git仓库克隆
 * - 本地文件夹扫描
 * - 分支管理
 * - 仓库信息提取
 */

const NodeGit = require('nodegit');
const path = require('path');
const fs = require('fs').promises;
const { fileManager } = require('../utils/fileManager');
const { logger } = require('../utils/logger');
const File = require('../models/File');
const {
    ExternalServiceError,
    ValidationError,
    NotFoundError
} = require('../utils/errorHandler');

class GitService {
    constructor() {
        this.tempDir = process.env.TEMP_DIR || './temp';
        this.cloneTimeout = parseInt(process.env.GIT_CLONE_TIMEOUT) || 300000; // 5分钟
        this.maxDepth = parseInt(process.env.GIT_CLONE_DEPTH) || 1; // 浅克隆深度
    }

    /**
     * 克隆Git仓库
     */
    async cloneRepository(repoUrl, targetDir, branch = null, options = {}) {
        try {
            logger.info('开始克隆Git仓库', {
                repoUrl,
                targetDir,
                branch,
                options
            });

            // 验证仓库URL
            this._validateRepoUrl(repoUrl);

            // 确保目标目录存在
            await fileManager.ensureDirectory(targetDir);

            // 克隆选项
            const cloneOptions = {
                checkoutBranch: branch || undefined,
                depth: options.depth || this.maxDepth,
                singleBranch: options.singleBranch !== false
            };

            // 添加认证信息（如果提供）
            if (options.username && options.password) {
                cloneOptions.fetchOpts = {
                    callbacks: {
                        credentials: () => NodeGit.Cred.userpassPlaintextNew(
                            options.username,
                            options.password
                        )
                    }
                };
            }

            // 克隆仓库
            const repository = await this._cloneWithTimeout(repoUrl, targetDir, cloneOptions);

            // 获取仓库信息
            const repoInfo = await this._getRepositoryInfo(repository);

            logger.info('Git仓库克隆成功', {
                repoUrl,
                targetDir,
                commitCount: repoInfo.commitCount,
                branchCount: repoInfo.branchCount,
                latestCommit: repoInfo.latestCommit?.shortId()
            });

            return {
                success: true,
                targetDir,
                repoInfo
            };
        } catch (error) {
            logger.error('Git仓库克隆失败', {
                repoUrl,
                targetDir,
                error: error.message
            });

            // 清理失败的克隆目录
            try {
                await fs.rmdir(targetDir, { recursive: true });
            } catch (cleanupError) {
                logger.warn('清理失败克隆目录失败', { targetDir, error: cleanupError.message });
            }

            throw new ExternalServiceError('Git服务', '仓库克隆失败', error);
        }
    }

    /**
     * 扫描本地文件夹
     */
    async scanLocalDirectory(localPath, options = {}) {
        try {
            logger.info('开始扫描本地文件夹', {
                localPath,
                options
            });

            // 验证本地路径
            const absolutePath = path.resolve(localPath);
            await this._validateLocalPath(absolutePath);

            // 检查是否为Git仓库
            const isGitRepo = await this._isGitRepository(absolutePath);

            // 扫描文件
            const scanResult = await fileManager.scanDirectory(absolutePath, {
                recursive: options.recursive !== false,
                includeHidden: false,
                maxDepth: options.maxDepth || 10,
                filter: options.filter || null
            });

            // 分析扫描结果
            const analysis = this._analyzeScanResult(scanResult);

            // 如果是Git仓库，获取Git信息
            let gitInfo = null;
            if (isGitRepo) {
                try {
                    gitInfo = await this._getGitRepositoryInfo(absolutePath);
                } catch (gitError) {
                    logger.warn('获取Git仓库信息失败', { path: absolutePath, error: gitError.message });
                }
            }

            logger.info('本地文件夹扫描完成', {
                localPath: absolutePath,
                totalFiles: analysis.totalFiles,
                codeFiles: analysis.codeFiles,
                directories: analysis.directories,
                totalSize: analysis.totalSize,
                isGitRepo
            });

            return {
                success: true,
                path: absolutePath,
                isGitRepository: isGitRepo,
                scanResult: scanResult,
                analysis: analysis,
                gitInfo: gitInfo
            };
        } catch (error) {
            logger.error('本地文件夹扫描失败', {
                localPath,
                error: error.message
            });
            throw new ExternalServiceError('文件系统', '本地文件夹扫描失败', error);
        }
    }

    /**
     * 获取Git仓库信息
     */
    async getRepositoryInfo(repoPath) {
        try {
            const repository = await NodeGit.Repository.open(repoPath);
            return await this._getRepositoryInfo(repository);
        } catch (error) {
            logger.error('获取Git仓库信息失败', {
                repoPath,
                error: error.message
            });
            throw new ExternalServiceError('Git服务', '获取仓库信息失败', error);
        }
    }

    /**
     * 带超时的克隆操作
     */
    async _cloneWithTimeout(repoUrl, targetDir, options) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Git克隆超时 (${this.cloneTimeout}ms)`));
            }, this.cloneTimeout);

            NodeGit.Clone(repoUrl, targetDir, options)
                .then(repository => {
                    clearTimeout(timeout);
                    resolve(repository);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    /**
     * 获取仓库信息
     */
    async _getRepositoryInfo(repository) {
        try {
            // 获取当前分支
            const currentBranch = await repository.getCurrentBranch();
            const branchName = currentBranch.shorthand();

            // 获取最新提交
            const headCommit = await repository.getHeadCommit();
            const latestCommit = headCommit;

            // 获取提交历史数量
            let commitCount = 0;
            try {
                const revwalk = NodeGit.Revwalk.create(repository);
                revwalk.push(headCommit.id());
                commitCount = revwalk.getCommitsCount();
            } catch (error) {
                logger.warn('获取提交数量失败', { error: error.message });
            }

            // 获取所有分支
            const references = await repository.getReferences(NodeGit.Reference.TYPE.LISTALL);
            const branches = references
                .filter(ref => ref.isBranch() || ref.isRemote())
                .map(ref => ({
                    name: ref.shorthand(),
                    isRemote: ref.isRemote(),
                    target: ref.target().tostrS()
                }));

            // 获取远程仓库信息
            const remotes = [];
            try {
                const remoteNames = await repository.getRemoteNames();
                for (const name of remoteNames) {
                    const remote = await repository.getRemote(name);
                    remotes.push({
                        name,
                        url: remote.url()
                    });
                }
            } catch (error) {
                logger.warn('获取远程仓库信息失败', { error: error.message });
            }

            // 获取仓库状态
            let status = null;
            try {
                status = await repository.getStatus();
            } catch (error) {
                logger.warn('获取仓库状态失败', { error: error.message });
            }

            return {
                branchName,
                latestCommit: {
                    id: latestCommit.id().tostrS(),
                    shortId: latestCommit.shortId(),
                    message: latestCommit.message(),
                    author: latestCommit.author().name(),
                    date: new Date(latestCommit.date() * 1000).toISOString()
                },
                commitCount,
                branches,
                remotes,
                isClean: status ? status.length === 0 : true,
                workingDirectoryChanges: status ? status.length : 0
            };
        } catch (error) {
            logger.error('获取仓库详细信息失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 检查是否为Git仓库
     */
    async _isGitRepository(dirPath) {
        try {
            await NodeGit.Repository.open(dirPath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取Git仓库信息（本地路径）
     */
    async _getGitRepositoryInfo(repoPath) {
        try {
            const repository = await NodeGit.Repository.open(repoPath);
            return await this._getRepositoryInfo(repository);
        } catch (error) {
            throw new ExternalServiceError('Git服务', '获取Git仓库信息失败', error);
        }
    }

    /**
     * 分析扫描结果
     */
    _analyzeScanResult(scanResult) {
        const analysis = {
            totalFiles: 0,
            codeFiles: 0,
            directories: 0,
            totalSize: 0,
            languages: {},
            largestFiles: [],
            fileTypes: {}
        };

        // 处理文件统计
        for (const item of scanResult) {
            if (item.isFile) {
                analysis.totalFiles++;
                analysis.totalSize += item.size || 0;

                // 文件类型统计
                const ext = item.extension || 'no_extension';
                analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;

                // 代码文件统计
                const language = File.detectLanguage(ext, item.name);
                if (language !== 'text') {
                    analysis.codeFiles++;
                    analysis.languages[language] = (analysis.languages[language] || 0) + 1;
                }

                // 记录大文件
                if (item.size > 1024 * 1024) { // 大于1MB
                    analysis.largestFiles.push({
                        path: item.relativePath,
                        size: item.size,
                        name: item.name
                    });
                }
            } else if (item.isDirectory) {
                analysis.directories++;
            }
        }

        // 排序大文件
        analysis.largestFiles.sort((a, b) => b.size - a.size);
        analysis.largestFiles = analysis.largestFiles.slice(0, 10); // 只保留前10个

        // 排序语言统计
        analysis.languages = Object.entries(analysis.languages)
            .map(([language, count]) => ({ language, count }))
            .sort((a, b) => b.count - a.count);

        return analysis;
    }

    /**
     * 验证仓库URL
     */
    _validateRepoUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new ValidationError('仓库URL不能为空');
        }

        const urlPattern = /^https?:\/\/.+|git@.+:.+$/;
        if (!urlPattern.test(url)) {
            throw new ValidationError('无效的仓库URL格式');
        }

        // 移除末尾的.git（如果存在）
        const normalizedUrl = url.endsWith('.git') ? url : url + '.git';

        return normalizedUrl;
    }

    /**
     * 验证本地路径
     */
    async _validateLocalPath(absolutePath) {
        try {
            const stats = await fs.stat(absolutePath);
            if (!stats.isDirectory()) {
                throw new ValidationError('指定的路径不是目录');
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new NotFoundError('指定的目录不存在');
            }
            throw error;
        }

        // 检查目录权限
        try {
            await fs.access(absolutePath, fs.constants.R_OK);
        } catch (error) {
            throw new ValidationError('没有目录读取权限');
        }
    }

    /**
     * 清理克隆的仓库
     */
    async cleanupClonedRepository(targetDir) {
        try {
            await fs.rmdir(targetDir, { recursive: true });
            logger.info('克隆仓库清理完成', { targetDir });
        } catch (error) {
            logger.error('清理克隆仓库失败', { targetDir, error: error.message });
            throw new ExternalServiceError('文件系统', '清理克隆仓库失败', error);
        }
    }

    /**
     * 获取仓库差异
     */
    async getRepositoryDiff(repoPath, fromCommit = null, toCommit = null) {
        try {
            const repository = await NodeGit.Repository.open(repoPath);

            const fromCommitOid = fromCommit
                ? await NodeGit.Oid.fromString(fromCommit)
                : (await repository.getReference('HEAD')).target();

            const toCommitOid = toCommit
                ? await NodeGit.Oid.fromString(toCommit)
                : await repository.getHeadCommit().id();

            const fromCommitObj = await repository.getCommit(fromCommitOid);
            const toCommitObj = await repository.getCommit(toCommitOid);

            const diff = await fromCommitObj.getDiff(toCommitObj);
            const patches = await diff.patches();

            const changes = patches.map(patch => ({
                oldFile: patch.oldFile().path(),
                newFile: patch.newFile().path(),
                status: this._getDiffStatus(patch.newFile().status()),
                additions: patch.numAdditions(),
                deletions: patch.numDeletions()
            }));

            return {
                success: true,
                changes,
                totalAdditions: changes.reduce((sum, change) => sum + change.additions, 0),
                totalDeletions: changes.reduce((sum, change) => sum + change.deletions, 0),
                filesChanged: changes.length
            };
        } catch (error) {
            logger.error('获取仓库差异失败', { repoPath, error: error.message });
            throw new ExternalServiceError('Git服务', '获取仓库差异失败', error);
        }
    }

    /**
     * 获取差异状态
     */
    _getDiffStatus(status) {
        switch (status) {
            case NodeGit.Diff.DELTA.NEW: return 'added';
            case NodeGit.Diff.DELTA.DELETED: return 'deleted';
            case NodeGit.Diff.DELTA.MODIFIED: return 'modified';
            case NodeGit.Diff.DELTA.RENAMED: return 'renamed';
            case NodeGit.Diff.DELTA.COPIED: return 'copied';
            case NodeGit.Diff.DELTA.IGNORED: return 'ignored';
            case NodeGit.Diff.DELTA.TYPECHANGE: return 'typechanged';
            case NodeGit.Diff.DELTA.UNREADABLE: return 'unreadable';
            case NodeGit.Diff.DELTA.CONFLICTED: return 'conflicted';
            default: return 'unknown';
        }
    }

    /**
     * 获取仓库标签
     */
    async getRepositoryTags(repoPath) {
        try {
            const repository = await NodeGit.Repository.open(repoPath);
            const references = await repository.getReferences(NodeGit.Reference.TYPE.LISTALL);

            const tags = references
                .filter(ref => ref.isTag())
                .map(ref => ({
                    name: ref.shorthand(),
                    target: ref.target().tostrS(),
                    isLightweight: ref.isTag() && !ref.isAnnotated()
                }));

            return {
                success: true,
                tags
            };
        } catch (error) {
            logger.error('获取仓库标签失败', { repoPath, error: error.message });
            throw new ExternalServiceError('Git服务', '获取仓库标签失败', error);
        }
    }
}

// 创建单例实例
const gitService = new GitService();

module.exports = { GitService, gitService };
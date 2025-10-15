/**
 * AI服务模块
 *
 * 功能：
 * - 大模型API客户端
 * - 提示词管理
 * - 结果缓存和重试机制
 * - 多API提供商支持
 */

const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { ExternalServiceError, ValidationError } = require('../utils/errorHandler');

class AIService {
    constructor() {
        this.apiEndpoint = process.env.API_ENDPOINT || 'https://api.openai.com/v1';
        this.apiKey = process.env.API_KEY;
        this.modelName = process.env.MODEL_NAME || 'gpt-3.5-turbo';
        this.timeout = parseInt(process.env.AI_REQUEST_TIMEOUT) || 30000;
        this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 4096;
        this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.3;
        this.retryAttempts = parseInt(process.env.AI_RETRY_ATTEMPTS) || 3;
        this.retryDelay = parseInt(process.env.AI_RETRY_DELAY) || 1000;

        // 缓存配置
        this.cacheEnabled = process.env.AI_CACHE_ENABLED === 'true';
        this.cache = new Map();
        this.cacheMaxSize = parseInt(process.env.AI_CACHE_MAX_SIZE) || 1000;
        this.cacheTTL = parseInt(process.env.AI_CACHE_TTL) || 3600000; // 1小时

        // 请求统计
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            totalTokens: 0
        };

        // 验证配置
        this.validateConfig();
    }

    /**
     * 验证配置
     */
    validateConfig() {
        if (!this.apiKey) {
            logger.warn('AI服务未配置API密钥，相关功能将不可用');
        }

        if (!this.apiEndpoint) {
            throw new ValidationError('AI API端点未配置');
        }

        if (this.maxTokens <= 0 || this.maxTokens > 32000) {
            throw new ValidationError('AI最大令牌数配置无效');
        }

        if (this.temperature < 0 || this.temperature > 2) {
            throw new ValidationError('AI温度参数配置无效');
        }
    }

    /**
     * 生成缓存键
     */
    generateCacheKey(messages, options = {}) {
        const keyData = {
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            model: this.modelName,
            temperature: this.temperature,
            maxTokens: options.maxTokens || this.maxTokens
        };

        return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
    }

    /**
     * 获取缓存结果
     */
    getCachedResult(cacheKey) {
        if (!this.cacheEnabled) {
            return null;
        }

        const cached = this.cache.get(cacheKey);
        if (!cached) {
            return null;
        }

        // 检查缓存是否过期
        if (Date.now() - cached.timestamp > this.cacheTTL) {
            this.cache.delete(cacheKey);
            return null;
        }

        this.stats.cacheHits++;
        logger.debug('AI缓存命中', { cacheKey });
        return cached.result;
    }

    /**
     * 缓存结果
     */
    cacheResult(cacheKey, result) {
        if (!this.cacheEnabled) {
            return;
        }

        // 如果缓存已满，删除最旧的条目
        if (this.cache.size >= this.cacheMaxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });

        logger.debug('AI结果已缓存', { cacheKey });
    }

    /**
     * 清理过期缓存
     */
    cleanupCache() {
        if (!this.cacheEnabled) {
            return;
        }

        const now = Date.now();
        const expiredKeys = [];

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
        }

        if (expiredKeys.length > 0) {
            logger.debug('清理过期AI缓存', { count: expiredKeys.length });
        }
    }

    /**
     * 发送API请求
     */
    async sendRequest(messages, options = {}) {
        try {
            this.stats.totalRequests++;

            const requestData = {
                model: options.model || this.modelName,
                messages: messages,
                temperature: options.temperature || this.temperature,
                max_tokens: options.maxTokens || this.maxTokens,
                stream: false
            };

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            };

            // 根据不同的API提供商调整请求格式
            const requestConfig = this.buildRequestConfig(requestData, headers, options);

            const response = await axios.post(
                requestConfig.url,
                requestConfig.data,
                {
                    timeout: options.timeout || this.timeout,
                    headers: requestConfig.headers
                }
            );

            // 处理响应
            const result = this.processResponse(response.data, options);

            // 更新统计信息
            this.stats.successfulRequests++;
            if (result.usage) {
                this.stats.totalTokens += result.usage.total_tokens || 0;
            }

            logger.info('AI API请求成功', {
                model: requestConfig.data.model,
                messagesCount: messages.length,
                tokens: result.usage?.total_tokens
            });

            return result;
        } catch (error) {
            this.stats.failedRequests++;
            logger.error('AI API请求失败', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            // 根据错误类型抛出相应的异常
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                if (status === 401) {
                    throw new ExternalServiceError('AI服务', 'API密钥无效或已过期', data);
                } else if (status === 429) {
                    throw new ExternalServiceError('AI服务', 'API请求频率限制', data);
                } else if (status === 400) {
                    throw new ExternalServiceError('AI服务', '请求参数错误', data);
                } else if (status >= 500) {
                    throw new ExternalServiceError('AI服务', '服务器内部错误', data);
                } else {
                    throw new ExternalServiceError('AI服务', `API请求失败 (${status})`, data);
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new ExternalServiceError('AI服务', '请求超时');
            } else {
                throw new ExternalServiceError('AI服务', '网络连接失败', error);
            }
        }
    }

    /**
     * 构建请求配置
     */
    buildRequestConfig(data, headers, options = {}) {
        // 基础配置（OpenAI兼容）
        let config = {
            url: `${this.apiEndpoint}/chat/completions`,
            data,
            headers
        };

        // 根据不同的API提供商调整
        if (this.apiEndpoint.includes('anthropic.com')) {
            // Anthropic Claude
            config.url = `${this.apiEndpoint}/messages`;
            config.data = {
                model: data.model,
                messages: data.messages,
                max_tokens: data.max_tokens,
                temperature: data.temperature
            };
            headers['x-api-key'] = this.apiKey;
            headers['anthropic-version'] = '2023-06-01';
            delete headers['Authorization'];
        } else if (this.apiEndpoint.includes('googleapis.com')) {
            // Google Gemini
            config.url = `${this.apiEndpoint}/models/${data.model}:generateContent`;
            config.data = {
                contents: data.messages.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                })),
                generationConfig: {
                    temperature: data.temperature,
                    maxOutputTokens: data.max_tokens
                }
            };
        }

        return config;
    }

    /**
     * 处理API响应
     */
    processResponse(data, options = {}) {
        // 根据不同的API提供商处理响应格式
        if (data.choices && data.choices[0]) {
            // OpenAI 兼容格式
            return {
                content: data.choices[0].message.content,
                usage: data.usage,
                model: data.model,
                finishReason: data.choices[0].finish_reason
            };
        } else if (data.content && data.content[0]) {
            // Anthropic Claude 格式
            return {
                content: data.content[0].text,
                usage: data.usage,
                model: data.model,
                finishReason: data.stop_reason
            };
        } else if (data.candidates && data.candidates[0]) {
            // Google Gemini 格式
            return {
                content: data.candidates[0].content.parts[0].text,
                usage: data.usageMetadata,
                model: options.model || this.modelName,
                finishReason: data.candidates[0].finishReason
            };
        } else {
            throw new ExternalServiceError('AI服务', '无法解析API响应格式');
        }
    }

    /**
     * 带重试的请求
     */
    async requestWithRetry(messages, options = {}) {
        const maxRetries = options.retryAttempts || this.retryAttempts;
        const delay = options.retryDelay || this.retryDelay;

        // 检查缓存
        const cacheKey = this.generateCacheKey(messages, options);
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.sendRequest(messages, options);

                // 缓存成功结果
                this.cacheResult(cacheKey, result);

                return result;
            } catch (error) {
                lastError = error;

                // 如果是认证错误或参数错误，不进行重试
                if (error instanceof ExternalServiceError &&
                    (error.message.includes('API密钥') || error.message.includes('请求参数'))) {
                    throw error;
                }

                // 最后一次尝试失败
                if (attempt === maxRetries) {
                    break;
                }

                // 指数退避延迟
                const backoffDelay = delay * Math.pow(2, attempt);
                logger.warn('AI API请求失败，等待重试', {
                    attempt: attempt + 1,
                    maxRetries: maxRetries + 1,
                    delay: backoffDelay,
                    error: error.message
                });

                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }

        throw lastError;
    }

    /**
     * 生成代码描述
     */
    async generateCodeDescription(code, language, context = {}) {
        const prompt = this.buildCodeDescriptionPrompt(code, language, context);

        try {
            const result = await this.requestWithRetry([
                {
                    role: 'system',
                    content: '你是一个专业的代码分析专家，擅长生成清晰、准确的代码描述。请用中文回答。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ], {
                maxTokens: 1000,
                temperature: 0.3
            });

            return result.content;
        } catch (error) {
            logger.error('生成代码描述失败', { error: error.message, language });
            throw new ExternalServiceError('AI服务', '生成代码描述失败', error);
        }
    }

    /**
     * 生成函数文档
     */
    async generateFunctionDoc(functionInfo) {
        const prompt = this.buildFunctionDocPrompt(functionInfo);

        try {
            const result = await this.requestWithRetry([
                {
                    role: 'system',
                    content: '你是一个专业的技术文档撰写专家，擅长为函数生成详细、规范的文档。请用中文回答。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ], {
                maxTokens: 800,
                temperature: 0.2
            });

            return result.content;
        } catch (error) {
            logger.error('生成函数文档失败', { error: error.message, function: functionInfo.name });
            throw new ExternalServiceError('AI服务', '生成函数文档失败', error);
        }
    }

    /**
     * 生成项目概览
     */
    async generateProjectOverview(projectStructure, stats) {
        const prompt = this.buildProjectOverviewPrompt(projectStructure, stats);

        try {
            const result = await this.requestWithRetry([
                {
                    role: 'system',
                    content: '你是一个软件架构师，擅长分析项目结构并生成专业的项目概览。请用中文回答。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ], {
                maxTokens: 1500,
                temperature: 0.3
            });

            return result.content;
        } catch (error) {
            logger.error('生成项目概览失败', { error: error.message });
            throw new ExternalServiceError('AI服务', '生成项目概览失败', error);
        }
    }

    /**
     * 构建代码描述提示词
     */
    buildCodeDescriptionPrompt(code, language, context) {
        return `
请为以下${language}代码生成简洁准确的描述：

\`\`\`${language}
${code}
\`\`\`

${context.filePath ? `文件路径: ${context.filePath}` : ''}
${context.className ? `所属类: ${context.className}` : ''}
${context.functionName ? `函数名: ${context.functionName}` : ''}

请提供：
1. 代码的主要功能
2. 关键实现逻辑
3. 使用的技术特点（如果有）

描述要求：
- 简洁明了，控制在200字以内
- 突出核心功能和实现要点
- 使用技术术语要准确
`;
    }

    /**
     * 构建函数文档提示词
     */
    buildFunctionDocPrompt(functionInfo) {
        return `
请为以下函数生成详细的文档说明：

函数名: ${functionInfo.name}
参数: ${functionInfo.parameters || '未知'}
返回值: ${functionInfo.returnType || '未知'}
函数代码:
\`\`\`${functionInfo.language}
${functionInfo.code}
\`\`\`

请生成包含以下内容的文档：
1. 函数功能描述
2. 参数说明
3. 返回值说明
4. 使用示例（如果适用）
5. 注意事项或限制

文档格式要求：
- 使用Markdown格式
- 结构清晰，便于阅读
- 内容准确，专业规范
`;
    }

    /**
     * 构建项目概览提示词
     */
    buildProjectOverviewPrompt(projectStructure, stats) {
        return `
请基于以下项目信息生成专业的项目概览：

项目统计信息：
- 总文件数: ${stats.totalFiles}
- 代码文件数: ${stats.codeFiles}
- 主要编程语言: ${stats.mainLanguages.join(', ')}
- 项目大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB

项目结构：
${projectStructure.substring(0, 2000)}${projectStructure.length > 2000 ? '...' : ''}

请生成包含以下内容的项目概览：
1. 项目简介和主要功能
2. 技术栈分析
3. 架构特点
4. 项目规模和复杂度评估
5. 开发建议（如果适用）

要求：
- 使用Markdown格式
- 内容专业、准确
- 结构清晰，重点突出
- 控制在800字以内
`;
    }

    /**
     * 获取服务统计信息
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            cacheEnabled: this.cacheEnabled,
            successRate: this.stats.totalRequests > 0 ?
                (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
            cacheHitRate: this.stats.totalRequests > 0 ?
                (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            totalTokens: 0
        };
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        logger.info('AI缓存已清空');
    }
}

// 创建单例实例
const aiService = new AIService();

// 定期清理缓存
setInterval(() => {
    aiService.cleanupCache();
}, 30 * 60 * 1000); // 30分钟清理一次

module.exports = { AIService, aiService };
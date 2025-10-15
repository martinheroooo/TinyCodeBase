/**
 * API调用封装工具
 *
 * 功能：
 * - HTTP请求封装
 * - 错误处理
 * - 请求拦截器
 * - 响应处理
 */

class API {
    constructor() {
        this.baseURL = '';
        this.timeout = 30000; // 30秒
        this.headers = {
            'Content-Type': 'application/json'
        };

        this.init();
    }

    /**
     * 初始化API客户端
     */
    init() {
        // 设置基础URL
        this.baseURL = window.location.origin + '/api/v1';

        // 设置请求拦截器
        this.setupInterceptors();
    }

    /**
     * 设置请求和响应拦截器
     */
    setupInterceptors() {
        // 可以在这里添加请求拦截器逻辑
        // 例如：添加认证token、请求日志等
    }

    /**
     * 通用请求方法
     */
    async request(url, options = {}) {
        const fullUrl = this.baseURL + url;
        const config = {
            method: 'GET',
            headers: { ...this.headers },
            timeout: this.timeout,
            ...options
        };

        // 处理请求体
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        // 添加超时控制
        const controller = new AbortController();
        config.signal = controller.signal;

        const timeoutId = setTimeout(() => {
            controller.abort();
        }, config.timeout);

        try {
            const response = await fetch(fullUrl, config);
            clearTimeout(timeoutId);

            // 处理响应
            return await this.handleResponse(response);
        } catch (error) {
            clearTimeout(timeoutId);
            throw this.handleRequestError(error);
        }
    }

    /**
     * 处理响应
     */
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');

        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // 检查响应状态
        if (!response.ok) {
            const error = new Error(data.message || data.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    /**
     * 处理请求错误
     */
    handleRequestError(error) {
        if (error.name === 'AbortError') {
            const apiError = new Error('请求超时');
            apiError.code = 'TIMEOUT';
            return apiError;
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            const apiError = new Error('网络连接失败');
            apiError.code = 'NETWORK_ERROR';
            return apiError;
        }

        return error;
    }

    /**
     * GET请求
     */
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;

        return this.request(fullUrl, {
            method: 'GET'
        });
    }

    /**
     * POST请求
     */
    async post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: data
        });
    }

    /**
     * PUT请求
     */
    async put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: data
        });
    }

    /**
     * PATCH请求
     */
    async patch(url, data = {}) {
        return this.request(url, {
            method: 'PATCH',
            body: data
        });
    }

    /**
     * DELETE请求
     */
    async delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }

    /**
     * 上传文件
     */
    async upload(url, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', this.baseURL + url);
            xhr.timeout = this.timeout;

            // 设置上传进度监听
            if (onProgress && xhr.upload) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        onProgress(progress, event.loaded, event.total);
                    }
                });
            }

            xhr.addEventListener('load', async () => {
                try {
                    const response = await this.handleResponse(xhr);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('上传失败'));
            });

            xhr.addEventListener('timeout', () => {
                reject(new Error('上传超时'));
            });

            xhr.send(formData);
        });
    }

    /**
     * 批量请求
     */
    async batch(requests) {
        try {
            const results = await Promise.allSettled(
                requests.map(req => {
                    const { method, url, data } = req;
                    switch (method.toLowerCase()) {
                        case 'get':
                            return this.get(url, data);
                        case 'post':
                            return this.post(url, data);
                        case 'put':
                            return this.put(url, data);
                        case 'patch':
                            return this.patch(url, data);
                        case 'delete':
                            return this.delete(url);
                        default:
                            return this.request(url, req);
                    }
                })
            );

            return {
                results: results.map(result => ({
                    status: result.status,
                    data: result.status === 'fulfilled' ? result.value : null,
                    error: result.status === 'rejected' ? result.reason : null
                })),
                success: results.every(result => result.status === 'fulfilled'),
                failed: results.filter(result => result.status === 'rejected').length
            };
        } catch (error) {
            throw new Error(`批量请求失败: ${error.message}`);
        }
    }

    /**
     * 取消请求
     */
    cancel(controller) {
        if (controller) {
            controller.abort();
        }
    }

    /**
     * 设置默认头部
     */
    setHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
    }

    /**
     * 设置超时时间
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }

    /**
     * 获取当前配置
     */
    getConfig() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: this.headers
        };
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const response = await this.get('/ping');
            return {
                status: 'healthy',
                response
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    /**
     * 重试请求
     */
    async retry(url, options = {}, maxRetries = 3, retryDelay = 1000) {
        let lastError;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await this.request(url, options);
            } catch (error) {
                lastError = error;

                // 如果是最后一次尝试，直接抛出错误
                if (i === maxRetries) {
                    break;
                }

                // 某些错误不需要重试
                if (error.status === 400 || error.status === 401 || error.status === 403) {
                    break;
                }

                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, i)));
            }
        }

        throw lastError;
    }

    /**
     * 缓存GET请求
     */
    async cachedGet(url, params = {}, cacheTime = 300000) { // 默认5分钟缓存
        const cacheKey = `api_cache_${url}_${JSON.stringify(params)}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < cacheTime) {
                    return data;
                }
            } catch (error) {
                // 缓存数据损坏，忽略
                localStorage.removeItem(cacheKey);
            }
        }

        const data = await this.get(url, params);
        localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
        }));

        return data;
    }

    /**
     * 清除缓存
     */
    clearCache(pattern = null) {
        if (pattern) {
            // 清除匹配模式的缓存
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('api_cache_') && key.includes(pattern)) {
                    localStorage.removeItem(key);
                }
            });
        } else {
            // 清除所有API缓存
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('api_cache_')) {
                    localStorage.removeItem(key);
                }
            });
        }
    }

    /**
     * 获取请求状态码统计
     */
    getStats() {
        return {
            totalRequests: this.totalRequests || 0,
            successRequests: this.successRequests || 0,
            failedRequests: this.failedRequests || 0,
            averageResponseTime: this.averageResponseTime || 0
        };
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.totalRequests = 0;
        this.successRequests = 0;
        this.failedRequests = 0;
        this.averageResponseTime = 0;
    }
}

// 创建全局API实例
const api = new API();

// 导出API类和实例
export { API, api };
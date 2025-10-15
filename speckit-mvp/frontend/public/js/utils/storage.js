/**
 * 本地存储工具
 *
 * 功能：
 * - localStorage封装
 * - sessionStorage封装
 * - 数据序列化
 * - 存储空间管理
 */

class Storage {
    constructor() {
        this.prefix = 'speckit_';
        this.defaultTTL = 7 * 24 * 60 * 60 * 1000; // 7天
    }

    /**
     * 设置localStorage
     */
    setLocal(key, value, ttl = null) {
        return this._set(this._getStorage('localStorage'), key, value, ttl);
    }

    /**
     * 获取localStorage
     */
    getLocal(key, defaultValue = null) {
        return this._get(this._getStorage('localStorage'), key, defaultValue);
    }

    /**
     * 删除localStorage
     */
    removeLocal(key) {
        return this._remove(this._getStorage('localStorage'), key);
    }

    /**
     * 清空localStorage
     */
    clearLocal() {
        return this._clear(this._getStorage('localStorage'));
    }

    /**
     * 设置sessionStorage
     */
    setSession(key, value, ttl = null) {
        return this._set(this._getStorage('sessionStorage'), key, value, ttl);
    }

    /**
     * 获取sessionStorage
     */
    getSession(key, defaultValue = null) {
        return this._get(this._getStorage('sessionStorage'), key, defaultValue);
    }

    /**
     * 删除sessionStorage
     */
    removeSession(key) {
        return this._remove(this._getStorage('sessionStorage'), key);
    }

    /**
     * 清空sessionStorage
     */
    clearSession() {
        return this._clear(this._getStorage('sessionStorage'));
    }

    /**
     * 获取存储对象
     */
    _getStorage(type) {
        try {
            return type === 'localStorage' ? window.localStorage : window.sessionStorage;
        } catch (error) {
            console.warn(`无法访问${type}:`, error);
            return null;
        }
    }

    /**
     * 设置存储值
     */
    _set(storage, key, value, ttl) {
        if (!storage) return false;

        try {
            const data = {
                value: this._serialize(value),
                timestamp: Date.now(),
                ttl: ttl || this.defaultTTL
            };

            storage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('存储设置失败:', error);
            return false;
        }
    }

    /**
     * 获取存储值
     */
    _get(storage, key, defaultValue = null) {
        if (!storage) return defaultValue;

        try {
            const item = storage.getItem(this.prefix + key);
            if (!item) return defaultValue;

            const data = JSON.parse(item);

            // 检查是否过期
            if (data.ttl && (Date.now() - data.timestamp) > data.ttl) {
                storage.removeItem(this.prefix + key);
                return defaultValue;
            }

            return this._deserialize(data.value);
        } catch (error) {
            console.warn('存储获取失败:', error);
            return defaultValue;
        }
    }

    /**
     * 删除存储值
     */
    _remove(storage, key) {
        if (!storage) return false;

        try {
            storage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.warn('存储删除失败:', error);
            return false;
        }
    }

    /**
     * 清空存储
     */
    _clear(storage) {
        if (!storage) return false;

        try {
            const keys = [];
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key);
                }
            }

            keys.forEach(key => storage.removeItem(key));
            return true;
        } catch (error) {
            console.warn('存储清空失败:', error);
            return false;
        }
    }

    /**
     * 序列化数据
     */
    _serialize(value) {
        try {
            return JSON.stringify(value);
        } catch (error) {
            console.warn('数据序列化失败:', error);
            return String(value);
        }
    }

    /**
     * 反序列化数据
     */
    _deserialize(value) {
        try {
            return JSON.parse(value);
        } catch (error) {
            return value;
        }
    }

    /**
     * 设置带前缀的键
     */
    setKey(prefix = '') {
        this.prefix = prefix;
    }

    /**
     * 获取所有键
     */
    getKeys(storageType = 'localStorage') {
        const storage = this._getStorage(storageType);
        if (!storage) return [];

        const keys = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }

        return keys;
    }

    /**
     * 获取存储大小
     */
    getStorageSize(storageType = 'localStorage') {
        const storage = this._getStorage(storageType);
        if (!storage) return { used: 0, total: 0, percentage: 0 };

        let used = 0;
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.prefix)) {
                const value = storage.getItem(key);
                used += (key + value).length;
            }
        }

        // 估算总存储空间（通常为5MB）
        const total = 5 * 1024 * 1024;
        const percentage = (used / total) * 100;

        return {
            used: used,
            total: total,
            percentage: percentage,
            usedFormatted: this._formatBytes(used),
            totalFormatted: this._formatBytes(total)
        };
    }

    /**
     * 格式化字节大小
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 清理过期数据
     */
    cleanup(storageType = 'localStorage') {
        const storage = this._getStorage(storageType);
        if (!storage) return;

        const keys = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key);
            }
        }

        let cleaned = 0;
        keys.forEach(key => {
            try {
                const item = storage.getItem(key);
                if (item) {
                    const data = JSON.parse(item);
                    if (data.ttl && (Date.now() - data.timestamp) > data.ttl) {
                        storage.removeItem(key);
                        cleaned++;
                    }
                }
            } catch (error) {
                // 如果数据损坏，直接删除
                storage.removeItem(key);
                cleaned++;
            }
        });

        return cleaned;
    }

    /**
     * 设置用户偏好
     */
    setPreference(key, value) {
        return this.setLocal(`pref_${key}`, value, 30 * 24 * 60 * 60 * 1000); // 30天
    }

    /**
     * 获取用户偏好
     */
    getPreference(key, defaultValue = null) {
        return this.getLocal(`pref_${key}`, defaultValue);
    }

    /**
     * 设置缓存
     */
    setCache(key, value, ttl = null) {
        return this.setLocal(`cache_${key}`, value, ttl);
    }

    /**
     * 获取缓存
     */
    getCache(key, defaultValue = null) {
        return this.getLocal(`cache_${key}`, defaultValue);
    }

    /**
     * 删除缓存
     */
    removeCache(key) {
        return this.removeLocal(`cache_${key}`);
    }

    /**
     * 清空所有缓存
     */
    clearCache() {
        const storage = this._getStorage('localStorage');
        if (!storage) return;

        const keys = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(this.prefix + 'cache_')) {
                keys.push(key);
            }
        }

        keys.forEach(key => storage.removeItem(key));
    }

    /**
     * 设置临时数据（session级别）
     */
    setTemp(key, value) {
        return this.setSession(`temp_${key}`, value);
    }

    /**
     * 获取临时数据
     */
    getTemp(key, defaultValue = null) {
        return this.getSession(`temp_${key}`, defaultValue);
    }

    /**
     * 删除临时数据
     */
    removeTemp(key) {
        return this.removeSession(`temp_${key}`);
    }

    /**
     * 保存表单数据
     */
    saveFormData(formId, data) {
        return this.setLocal(`form_${formId}`, data);
    }

    /**
     * 加载表单数据
     */
    loadFormData(formId, defaultValue = {}) {
        return this.getLocal(`form_${formId}`, defaultValue);
    }

    /**
     * 保存搜索历史
     */
    saveSearchHistory(query) {
        const history = this.getSearchHistory();
        const filtered = history.filter(item => item !== query);
        filtered.unshift(query);
        const limited = filtered.slice(0, 10); // 只保留最近10个

        return this.setLocal('search_history', limited, 7 * 24 * 60 * 60 * 1000); // 7天
    }

    /**
     * 获取搜索历史
     */
    getSearchHistory() {
        return this.getLocal('search_history', []);
    }

    /**
     * 清空搜索历史
     */
    clearSearchHistory() {
        return this.removeLocal('search_history');
    }

    /**
     * 设置项目配置
     */
    setProjectConfig(projectId, config) {
        return this.setLocal(`project_config_${projectId}`, config);
    }

    /**
     * 获取项目配置
     */
    getProjectConfig(projectId, defaultValue = {}) {
        return this.getLocal(`project_config_${projectId}`, defaultValue);
    }

    /**
     * 设置页面状态
     */
    setPageState(page, state) {
        return this.setSession(`page_state_${page}`, state);
    }

    /**
     * 获取页面状态
     */
    getPageState(page, defaultValue = {}) {
        return this.getSession(`page_state_${page}`, defaultValue);
    }

    /**
     * 导出所有数据
     */
    exportData() {
        const data = {
            local: {},
            session: {},
            timestamp: new Date().toISOString()
        };

        // 导出localStorage数据
        const localStorage = this._getStorage('localStorage');
        if (localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    data.local[key] = localStorage.getItem(key);
                }
            }
        }

        // 导出sessionStorage数据
        const sessionStorage = this._getStorage('sessionStorage');
        if (sessionStorage) {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    data.session[key] = sessionStorage.getItem(key);
                }
            }
        }

        return data;
    }

    /**
     * 导入数据
     */
    importData(data, overwrite = false) {
        let imported = 0;

        try {
            // 导入localStorage数据
            if (data.local) {
                Object.entries(data.local).forEach(([key, value]) => {
                    if (overwrite || !this.getLocal(key.substring(this.prefix.length))) {
                        this._getStorage('localStorage').setItem(key, value);
                        imported++;
                    }
                });
            }

            // 导入sessionStorage数据
            if (data.session) {
                Object.entries(data.session).forEach(([key, value]) => {
                    if (overwrite || !this.getSession(key.substring(this.prefix.length))) {
                        this._getStorage('sessionStorage').setItem(key, value);
                        imported++;
                    }
                });
            }

            return imported;
        } catch (error) {
            console.error('数据导入失败:', error);
            return 0;
        }
    }

    /**
     * 检查存储支持
     */
    isSupported(storageType = 'localStorage') {
        try {
            const storage = this._getStorage(storageType);
            if (!storage) return false;

            const testKey = '__storage_test__';
            storage.setItem(testKey, 'test');
            storage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// 创建全局实例
const storage = new Storage();

// 导出工具类和实例
export { Storage, storage };
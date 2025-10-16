/**
 * 轻量级AI代码知识库 - 主应用入口
 *
 * 主要功能：
 * - 应用初始化和路由管理
 * - 页面切换和状态管理
 * - 组件初始化和事件绑定
 */

// 等待全局变量加载完成
function waitForGlobals() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 最多等待1秒
        
        const checkGlobals = () => {
            attempts++;
            
            if (window.api && window.domUtils && window.storage &&
                window.ProjectCard && window.ImportForm && window.ProgressBar &&
                window.SearchBox && window.SearchResult) {
                console.log('所有全局变量已加载完成');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('等待全局变量超时，已加载的变量:', {
                    api: !!window.api,
                    domUtils: !!window.domUtils,
                    storage: !!window.storage,
                    ProjectCard: !!window.ProjectCard,
                    ImportForm: !!window.ImportForm,
                    ProgressBar: !!window.ProgressBar,
                    SearchBox: !!window.SearchBox,
                    SearchResult: !!window.SearchResult
                });
                reject(new Error('等待全局变量超时'));
            } else {
                setTimeout(checkGlobals, 10);
            }
        };
        checkGlobals();
    });
}

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.components = {};
        this.api = window.api;
        this.storage = window.storage;
        this.dom = window.domUtils;

        this.init();
    }

    /**
     * 应用初始化
     */
    async init() {
        try {
            // 初始化组件
            await this.initComponents();

            // 绑定事件
            this.bindEvents();

            // 加载初始数据
            await this.loadInitialData();

            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showNotification('应用初始化失败', 'error');
        }
    }

    /**
     * 初始化组件
     */
    async initComponents() {
        // 导入表单组件
        this.components.importForm = new window.ImportForm({
            onSubmit: this.handleImportSubmit.bind(this),
            onCancel: this.handleImportCancel.bind(this)
        });

        // 进度条组件
        this.components.progressBar = new window.ProgressBar({
            container: document.getElementById('progress-container'),
            onCancel: this.handleProgressCancel.bind(this)
        });

        // 搜索框组件
        this.components.searchBox = new window.SearchBox({
            input: document.getElementById('search-input'),
            button: document.getElementById('search-btn'),
            onSearch: this.handleSearch.bind(this)
        });

        // 项目卡片组件
        this.components.projectCard = new window.ProjectCard({
            onView: this.handleProjectView.bind(this),
            onDelete: this.handleProjectDelete.bind(this),
            onRegenerate: this.handleProjectRegenerate.bind(this),
            onExport: this.handleProjectExport.bind(this)
        });

        // 搜索结果组件
        this.components.searchResult = new window.SearchResult({
            container: document.getElementById('search-results'),
            onSelect: this.handleSearchResultSelect.bind(this),
            onLoadMore: this.handleSearchLoadMore.bind(this)
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 导航按钮事件
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.switchPage(page);
            });
        });

        // 仪表板按钮事件
        document.getElementById('import-project-btn')?.addEventListener('click', () => {
            this.components.importForm.show();
        });

        document.getElementById('view-stats-btn')?.addEventListener('click', () => {
            this.switchPage('projects');
        });

        document.getElementById('global-search-btn')?.addEventListener('click', () => {
            this.switchPage('search');
            document.getElementById('search-input').focus();
        });

        // 新建项目按钮
        document.getElementById('new-project-btn')?.addEventListener('click', () => {
            this.components.importForm.show();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+F 或 Cmd+F 快速搜索
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.switchPage('search');
                document.getElementById('search-input').focus();
            }

            // ESC 关闭模态框
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // 窗口关闭事件
        window.addEventListener('beforeunload', (e) => {
            // 如果有正在进行的任务，提示用户
            if (this.hasActiveTasks()) {
                e.preventDefault();
                e.returnValue = '有任务正在进行中，确定要离开吗？';
            }
        });
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            // 加载项目列表
            await this.loadProjects();

            // 恢复搜索状态
            this.restoreSearchState();

            // 检查未完成的任务
            await this.checkPendingTasks();
        } catch (error) {
            console.error('加载初始数据失败:', error);
        }
    }

    /**
     * 切换页面
     */
    switchPage(pageName) {
        // 更新导航状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });

        // 切换页面显示
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === `${pageName}-page`);
        });

        this.currentPage = pageName;

        // 页面切换后的特殊处理
        if (pageName === 'projects') {
            this.loadProjects();
        } else if (pageName === 'search') {
            document.getElementById('search-input').focus();
        }

        // 保存页面状态
        this.storage.set('currentPage', pageName);
    }

    /**
     * 处理导入提交
     */
    async handleImportSubmit(data) {
        try {
            this.components.importForm.hide();
            this.components.progressBar.show('正在导入项目...');

            const response = await this.api.post('/api/v1/projects', data);

            if (response.success) {
                this.showNotification('项目导入成功', 'success');
                this.startProjectProcessing(response.data.id);
                this.switchPage('projects');
            } else {
                throw new Error(response.message || '导入失败');
            }
        } catch (error) {
            console.error('导入项目失败:', error);
            this.showNotification(`导入失败: ${error.message}`, 'error');
            this.components.progressBar.hide();
        }
    }

    /**
     * 处理导入取消
     */
    handleImportCancel() {
        // 修复无限递归问题：不再调用hide()，因为hide()已经会调用这个方法
        // 直接关闭模态框即可
        const modal = document.getElementById('import-dialog');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * 处理进度取消
     */
    async handleProgressCancel() {
        try {
            // 取消当前任务
            await this.api.post('/api/v1/tasks/cancel');
            this.components.progressBar.hide();
            this.showNotification('任务已取消', 'warning');
        } catch (error) {
            console.error('取消任务失败:', error);
        }
    }

    /**
     * 处理搜索
     */
    async handleSearch(query, filters) {
        try {
            this.showSearchLoading();

            const response = await this.api.get('/api/v1/search', {
                q: query,
                filters: filters
            });

            this.displaySearchResults(response.data);
            this.saveSearchState(query, filters);
        } catch (error) {
            console.error('搜索失败:', error);
            this.showNotification(`搜索失败: ${error.message}`, 'error');
            this.hideSearchLoading();
        }
    }

    /**
     * 处理搜索结果选择
     */
    handleSearchResultSelect(result) {
        console.log('搜索结果选择:', result);
        // 这里可以实现跳转到具体结果的功能
        this.showNotification('详情功能开发中...', 'warning');
    }

    /**
     * 处理搜索加载更多
     */
    async handleSearchLoadMore(query, offset) {
        try {
            const response = await this.api.get('/api/v1/search', {
                q: query,
                offset: offset,
                limit: 20
            });

            return response.data;
        } catch (error) {
            console.error('加载更多搜索结果失败:', error);
            return [];
        }
    }

    /**
     * 处理项目查看
     */
    handleProjectView(projectId) {
        // 跳转到项目详情页面（后续实现）
        console.log('查看项目:', projectId);
        this.showNotification('项目详情功能开发中...', 'warning');
    }

    /**
     * 处理项目删除
     */
    async handleProjectDelete(projectId) {
        if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) {
            return;
        }

        try {
            await this.api.delete(`/api/v1/projects/${projectId}`);
            this.showNotification('项目删除成功', 'success');
            this.loadProjects(); // 重新加载项目列表
        } catch (error) {
            console.error('删除项目失败:', error);
            this.showNotification(`删除失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理项目重新生成
     */
    async handleProjectRegenerate(projectId) {
        try {
            await this.api.post(`/api/v1/projects/${projectId}/regenerate`);
            this.showNotification('开始重新生成文档', 'success');
            this.startProjectProcessing(projectId);
        } catch (error) {
            console.error('重新生成失败:', error);
            this.showNotification(`重新生成失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理项目导出
     */
    async handleProjectExport(projectId, format) {
        try {
            const response = await this.api.post(`/api/v1/projects/${projectId}/export`, {
                format: format
            });

            if (response.success) {
                // 下载文件
                this.downloadFile(response.data.url, response.data.filename);
                this.showNotification('文档导出成功', 'success');
            }
        } catch (error) {
            console.error('导出失败:', error);
            this.showNotification(`导出失败: ${error.message}`, 'error');
        }
    }

    /**
     * 加载项目列表
     */
    async loadProjects() {
        try {
            const response = await this.api.get('/api/v1/projects');
            this.displayProjects(response.data);
        } catch (error) {
            console.error('加载项目列表失败:', error);
            this.showNotification('加载项目列表失败', 'error');
        }
    }

    /**
     * 显示项目列表
     */
    displayProjects(projects) {
        const container = document.getElementById('projects-list');

        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div class="empty-state-title">还没有项目</div>
                    <div class="empty-state-description">
                        点击"新建项目"按钮来导入你的第一个代码项目
                    </div>
                    <button class="btn btn-primary" onclick="app.components.importForm.show()">
                        新建项目
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project =>
            this.components.projectCard.render(project)
        ).join('');

        // 绑定项目卡片事件
        this.components.projectCard.bindEvents();
    }

    /**
     * 显示搜索结果
     */
    displaySearchResults(results) {
        const container = document.getElementById('search-results');

        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">没有找到结果</div>
                    <div class="empty-state-description">
                        尝试使用不同的关键词或检查拼写
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = results.map(result =>
            this.components.searchResult.render(result)
        ).join('');
    }

    /**
     * 开始项目处理
     */
    startProjectProcessing(projectId) {
        // 轮询任务状态
        const pollInterval = setInterval(async () => {
            try {
                const response = await this.api.get(`/api/v1/tasks/${projectId}`);
                const task = response.data;

                // 更新进度
                this.components.progressBar.update(
                    task.progress,
                    task.status_message
                );

                // 检查是否完成
                if (task.status === 'completed') {
                    clearInterval(pollInterval);
                    this.components.progressBar.hide();
                    this.showNotification('项目处理完成', 'success');
                    this.loadProjects(); // 重新加载项目列表
                } else if (task.status === 'failed') {
                    clearInterval(pollInterval);
                    this.components.progressBar.hide();
                    this.showNotification(`项目处理失败: ${task.error}`, 'error');
                }
            } catch (error) {
                console.error('轮询任务状态失败:', error);
                clearInterval(pollInterval);
            }
        }, 2000);
    }

    /**
     * 检查未完成的任务
     */
    async checkPendingTasks() {
        try {
            const response = await this.api.get('/api/v1/tasks/pending');

            if (response.data && response.data.length > 0) {
                // 恢复任务进度显示
                const task = response.data[0];
                this.startProjectProcessing(task.project_id);
                this.showNotification('发现未完成的任务，已恢复处理', 'warning');
            }
        } catch (error) {
            console.error('检查待处理任务失败:', error);
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info', title = null) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || 'ℹ️';

        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;

        const container = document.getElementById('notifications');
        container.appendChild(notification);

        // 绑定关闭事件
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // 自动关闭
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 关闭所有模态框
     */
    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    /**
     * 保存搜索状态
     */
    saveSearchState(query, filters) {
        this.storage.set('lastSearch', { query, filters });
    }

    /**
     * 恢复搜索状态
     */
    restoreSearchState() {
        const lastSearch = this.storage.get('lastSearch');
        if (lastSearch) {
            document.getElementById('search-input').value = lastSearch.query;

            // 恢复过滤器状态
            Object.keys(lastSearch.filters).forEach(key => {
                const checkbox = document.getElementById(`filter-${key}`);
                if (checkbox) {
                    checkbox.checked = lastSearch.filters[key];
                }
            });
        }
    }

    /**
     * 显示搜索加载状态
     */
    showSearchLoading() {
        const container = document.getElementById('search-results');
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="loading"></div>
                <p>正在搜索...</p>
            </div>
        `;
    }

    /**
     * 隐藏搜索加载状态
     */
    hideSearchLoading() {
        // 在显示结果时自动隐藏
    }

    /**
     * 下载文件
     */
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    /**
     * 检查是否有活跃任务
     */
    hasActiveTasks() {
        return document.getElementById('progress-container').classList.contains('hidden') === false;
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('开始初始化应用...');
        await waitForGlobals();
        console.log('全局变量加载完成，创建应用实例...');
        window.app = new App();
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        
        // 显示错误信息给用户
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h4>应用初始化失败</h4>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">重新加载</button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// 全局错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    if (window.app) {
        window.app.showNotification('应用发生错误，请刷新页面重试', 'error');
    }
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
    if (window.app) {
        window.app.showNotification('网络请求失败，请检查连接', 'error');
    }
});
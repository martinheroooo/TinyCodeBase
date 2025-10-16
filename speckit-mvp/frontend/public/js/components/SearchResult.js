/**
 * 搜索结果组件
 *
 * 功能：
 * - 搜索结果渲染
 * - 结果高亮显示
 * - 结果分组和排序
 * - 无限滚动
 */

class SearchResult {
    constructor(options = {}) {
        this.container = options.container;
        this.onSelect = options.onSelect || (() => {});
        this.onLoadMore = options.onLoadMore || (() => {});
        this.highlightClass = options.highlightClass || 'search-highlight';
        this.pageSize = options.pageSize || 20;
        this.maxResults = options.maxResults || 100;

        this.results = [];
        this.currentQuery = '';
        this.totalResults = 0;
        this.isLoading = false;
        this.hasMoreResults = false;

        this.init();
    }

    /**
     * 初始化
     */
    init() {
        this._setupContainer();
        this._bindEvents();
    }

    /**
     * 设置容器
     */
    _setupContainer() {
        if (this.container) {
            this._enhanceExistingContainer();
        } else {
            this._createContainer();
        }
    }

    /**
     * 增强现有容器
     */
    _enhanceExistingContainer() {
        // 添加结果容器类
        this.container.classList.add('search-results-container');

        // 添加加载指示器
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'search-results-loading hidden';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <p>正在搜索...</p>
        `;
        this.container.appendChild(this.loadingIndicator);
    }

    /**
     * 创建容器
     */
    _createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'search-results-container';

        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'search-results-loading hidden';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <p>正在搜索...</p>
        `;

        this.container.appendChild(this.loadingIndicator);

        // 插入到页面
        const targetElement = document.querySelector('.search-page') ||
                             document.querySelector('main') ||
                             document.body;
        targetElement.appendChild(this.container);
    }

    /**
     * 绑定事件
     */
    _bindEvents() {
        // 滚动加载更多
        if (this.container) {
            this.container.addEventListener('scroll', () => {
                this._handleScroll();
            });
        }

        // 全局滚动监听
        window.addEventListener('scroll', () => {
            this._handleScroll();
        });
    }

    /**
     * 处理滚动事件
     */
    _handleScroll() {
        if (this.isLoading || !this.hasMoreResults) return;

        const container = this.container;
        const scrollTop = container.scrollTop || window.pageYOffset;
        const containerHeight = container.clientHeight || window.innerHeight;
        const scrollHeight = container.scrollHeight || document.documentElement.scrollHeight;

        // 距离底部还有200px时加载更多
        if (scrollTop + containerHeight >= scrollHeight - 200) {
            this.loadMore();
        }
    }

    /**
     * 显示搜索结果
     */
    showResults(query, results, totalCount = null) {
        this.currentQuery = query;
        this.results = results;
        this.totalResults = totalCount || results.length;
        this.hasMoreResults = this.totalResults > results.length;

        this._renderResults();
        this._updateResultInfo();
    }

    /**
     * 渲染结果
     */
    _renderResults() {
        if (this.results.length === 0) {
            this._renderEmptyState();
            return;
        }

        // 按类型分组
        const groupedResults = this._groupResults(this.results);

        let html = `
            <div class="search-results-header">
                <div class="result-stats">
                    找到 <span class="result-count">${this.totalResults}</span> 个结果
                    ${this.currentQuery ? `关于 "<span class="search-query">${this._escapeHtml(this.currentQuery)}</span>"` : ''}
                </div>
                <div class="result-options">
                    <select class="result-sort" id="result-sort">
                        <option value="relevance">相关度</option>
                        <option value="name">名称</option>
                        <option value="modified">修改时间</option>
                        <option value="size">文件大小</option>
                    </select>
                </div>
            </div>
            <div class="search-results-list">
        `;

        // 渲染分组结果
        Object.entries(groupedResults).forEach(([type, items]) => {
            const typeLabel = this._getTypeLabel(type);
            html += `
                <div class="result-group">
                    <div class="result-group-header">
                        <h3 class="result-group-title">${typeLabel}</h3>
                        <span class="result-group-count">${items.length}</span>
                    </div>
                    <div class="result-group-items">
                        ${items.map(item => this._renderResultItem(item)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // 加载更多按钮
        if (this.hasMoreResults) {
            html += `
                <div class="search-results-footer">
                    <button class="btn btn-secondary load-more-btn" id="load-more-btn">
                        加载更多结果
                    </button>
                </div>
            `;
        }

        this.container.innerHTML = html;
        this._bindResultEvents();
    }

    /**
     * 渲染结果项
     */
    _renderResultItem(item) {
        const title = this._highlightText(item.title || item.name, this.currentQuery);
        const snippet = item.snippet ? this._highlightText(item.snippet, this.currentQuery) : '';
        const filePath = this._highlightText(item.file_path || item.path, this.currentQuery);
        const fileSize = this._formatFileSize(item.file_size || 0);
        const modifiedTime = item.modified_at ? new Date(item.modified_at).toLocaleString('zh-CN') : '';
        const relevance = item.relevance || item.score || 0;

        return `
            <div class="result-item" data-item-id="${item.id}" data-relevance="${relevance}">
                <div class="result-item-header">
                    <h4 class="result-item-title">
                        <a href="#" class="result-item-link">${title}</a>
                    </h4>
                    <div class="result-item-meta">
                        <span class="result-item-type ${item.type}">${this._getTypeLabel(item.type)}</span>
                        <span class="result-item-score">${Math.round(relevance * 100)}% 匹配</span>
                    </div>
                </div>

                ${snippet ? `
                    <div class="result-item-snippet">
                        ${snippet}
                    </div>
                ` : ''}

                <div class="result-item-footer">
                    <div class="result-item-path">
                        <i class="icon">📁</i>
                        <span class="path-text">${filePath}</span>
                    </div>
                    <div class="result-item-info">
                        ${fileSize ? `<span class="file-size">${fileSize}</span>` : ''}
                        ${modifiedTime ? `<span class="modified-time">${modifiedTime}</span>` : ''}
                        ${item.line_number ? `<span class="line-number">行 ${item.line_number}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染空状态
     */
    _renderEmptyState() {
        const emptyHtml = `
            <div class="search-results-empty">
                <div class="empty-icon">🔍</div>
                <h3 class="empty-title">没有找到结果</h3>
                <p class="empty-description">
                    ${this.currentQuery
                        ? `没有找到包含 "<strong>${this._escapeHtml(this.currentQuery)}</strong>" 的结果`
                        : '请输入搜索关键词'
                    }
                </p>
                <div class="empty-suggestions">
                    <h4>搜索建议：</h4>
                    <ul>
                        <li>检查关键词拼写</li>
                        <li>尝试使用不同的关键词</li>
                        <li>使用更通用的搜索词</li>
                        <li>减少搜索筛选条件</li>
                    </ul>
                </div>
            </div>
        `;
        this.container.innerHTML = emptyHtml;
    }

    /**
     * 分组结果
     */
    _groupResults(results) {
        const groups = {};
        results.forEach(item => {
            const type = item.type || 'unknown';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(item);
        });
        return groups;
    }

    /**
     * 获取类型标签
     */
    _getTypeLabel(type) {
        const labels = {
            'file': '文件',
            'function': '函数',
            'class': '类',
            'variable': '变量',
            'comment': '注释',
            'string': '字符串',
            'folder': '文件夹',
            'project': '项目',
            'unknown': '其他'
        };
        return labels[type] || type;
    }

    /**
     * 高亮文本
     */
    _highlightText(text, query) {
        if (!text || !query) return this._escapeHtml(text);

        const regex = new RegExp(`(${this._escapeRegex(query)})`, 'gi');
        return this._escapeHtml(text).replace(regex, `<mark class="${this.highlightClass}">$1</mark>`);
    }

    /**
     * 绑定结果事件
     */
    _bindResultEvents() {
        // 结果项点击
        this.container.querySelectorAll('.result-item-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const itemElement = e.target.closest('.result-item');
                const itemId = itemElement.dataset.itemId;
                const item = this.results.find(r => r.id == itemId);
                if (item) {
                    this.onSelect(item);
                }
            });
        });

        // 加载更多按钮
        const loadMoreBtn = this.container.querySelector('#load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }

        // 排序选择
        const sortSelect = this.container.querySelector('#result-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this._sortResults(e.target.value);
            });
        }
    }

    /**
     * 加载更多结果
     */
    async loadMore() {
        if (this.isLoading || !this.hasMoreResults) return;

        this.isLoading = true;
        this._showLoading();

        try {
            const newResults = await this.onLoadMore(this.currentQuery, this.results.length);
            if (newResults && newResults.length > 0) {
                this.results.push(...newResults);
                this._appendResults(newResults);
                this.hasMoreResults = this.totalResults > this.results.length;
            } else {
                this.hasMoreResults = false;
            }
        } catch (error) {
            console.error('加载更多结果失败:', error);
        } finally {
            this.isLoading = false;
            this._hideLoading();
            this._updateLoadMoreButton();
        }
    }

    /**
     * 追加结果
     */
    _appendResults(newResults) {
        const container = this.container.querySelector('.search-results-list');
        if (!container) return;

        // 按类型分组新结果
        const groupedResults = this._groupResults(newResults);

        Object.entries(groupedResults).forEach(([type, items]) => {
            const existingGroup = container.querySelector(`.result-group[data-type="${type}"]`);

            if (existingGroup) {
                // 追加到现有分组
                const itemsContainer = existingGroup.querySelector('.result-group-items');
                const itemsHtml = items.map(item => this._renderResultItem(item)).join('');
                itemsContainer.insertAdjacentHTML('beforeend', itemsHtml);

                // 更新计数
                const countElement = existingGroup.querySelector('.result-group-count');
                const currentCount = parseInt(countElement.textContent) || 0;
                countElement.textContent = currentCount + items.length;
            } else {
                // 创建新分组
                const typeLabel = this._getTypeLabel(type);
                const groupHtml = `
                    <div class="result-group" data-type="${type}">
                        <div class="result-group-header">
                            <h3 class="result-group-title">${typeLabel}</h3>
                            <span class="result-group-count">${items.length}</span>
                        </div>
                        <div class="result-group-items">
                            ${items.map(item => this._renderResultItem(item)).join('')}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', groupHtml);
            }
        });

        this._bindResultEvents();
    }

    /**
     * 排序结果
     */
    _sortResults(sortBy) {
        switch (sortBy) {
            case 'name':
                this.results.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
                break;
            case 'modified':
                this.results.sort((a, b) => new Date(b.modified_at || 0) - new Date(a.modified_at || 0));
                break;
            case 'size':
                this.results.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
                break;
            case 'relevance':
            default:
                this.results.sort((a, b) => (b.relevance || b.score || 0) - (a.relevance || a.score || 0));
                break;
        }

        this._renderResults();
    }

    /**
     * 更新结果信息
     */
    _updateResultInfo() {
        const statsElement = this.container.querySelector('.result-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                找到 <span class="result-count">${this.totalResults}</span> 个结果
                ${this.currentQuery ? `关于 "<span class="search-query">${this._escapeHtml(this.currentQuery)}</span>"` : ''}
            `;
        }
    }

    /**
     * 更新加载更多按钮
     */
    _updateLoadMoreButton() {
        const button = this.container.querySelector('#load-more-btn');
        if (button) {
            if (this.hasMoreResults) {
                button.style.display = 'block';
                button.textContent = '加载更多结果';
            } else {
                button.style.display = 'none';
            }
        }
    }

    /**
     * 显示加载状态
     */
    _showLoading() {
        this.loadingIndicator.classList.remove('hidden');
    }

    /**
     * 隐藏加载状态
     */
    _hideLoading() {
        this.loadingIndicator.classList.add('hidden');
    }

    /**
     * 清空结果
     */
    clear() {
        this.results = [];
        this.currentQuery = '';
        this.totalResults = 0;
        this.hasMoreResults = false;
        this.container.innerHTML = '';
    }

    /**
     * 格式化文件大小
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * HTML转义
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 正则转义
     */
    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// 导出为全局变量
window.SearchResult = SearchResult;
/**
 * 搜索框组件
 *
 * 功能：
 * - 搜索输入框
 * - 搜索历史
 * - 快捷键支持
 * - 实时搜索建议
 */

class SearchBox {
    constructor(options = {}) {
        this.input = options.input;
        this.button = options.button;
        this.onSearch = options.onSearch || (() => {});
        this.placeholder = options.placeholder || '搜索代码、函数、文档...';
        this.maxHistoryItems = options.maxHistoryItems || 10;

        this.searchHistory = [];
        this.isExpanded = false;

        this.init();
    }

    /**
     * 初始化搜索框
     */
    init() {
        this._setupSearchBox();
        this._loadSearchHistory();
        this._bindEvents();
    }

    /**
     * 设置搜索框HTML
     */
    _setupSearchBox() {
        if (this.input && this.button) {
            // 使用现有的input和button
            this.input.placeholder = this.placeholder;
            this._enhanceExistingElements();
        } else {
            // 创建完整的搜索框
            this._createSearchBox();
        }
    }

    /**
     * 增强现有元素
     */
    _enhanceExistingElements() {
        // 添加搜索建议容器
        this.suggestionsContainer = document.createElement('div');
        this.suggestionsContainer.className = 'search-suggestions hidden';
        this.input.parentNode.appendChild(this.suggestionsContainer);

        // 添加加载指示器
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'search-loading hidden';
        this.loadingIndicator.innerHTML = '<div class="loading-spinner"></div>';
        this.input.parentNode.appendChild(this.loadingIndicator);
    }

    /**
     * 创建搜索框
     */
    _createSearchBox() {
        const container = document.createElement('div');
        container.className = 'search-box-container';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'search-input';
        this.input.placeholder = this.placeholder;
        this.input.autocomplete = 'off';

        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'search-btn';
        this.button.innerHTML = '<i class="icon">🔍</i>';

        this.suggestionsContainer = document.createElement('div');
        this.suggestionsContainer.className = 'search-suggestions hidden';

        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'search-loading hidden';
        this.loadingIndicator.innerHTML = '<div class="loading-spinner"></div>';

        container.appendChild(this.input);
        container.appendChild(this.button);
        container.appendChild(this.suggestionsContainer);
        container.appendChild(this.loadingIndicator);

        // 插入到目标位置
        const targetElement = document.querySelector('.search-container') ||
                             document.querySelector('header') ||
                             document.body;
        targetElement.appendChild(container);
    }

    /**
     * 绑定事件
     */
    _bindEvents() {
        // 搜索输入事件
        this.input.addEventListener('input', (e) => {
            this._handleInput(e.target.value);
        });

        // 键盘事件
        this.input.addEventListener('keydown', (e) => {
            this._handleKeydown(e);
        });

        // 焦点事件
        this.input.addEventListener('focus', () => {
            this._showSuggestions();
        });

        this.input.addEventListener('blur', () => {
            // 延迟隐藏建议，以便点击建议项
            setTimeout(() => {
                this._hideSuggestions();
            }, 200);
        });

        // 搜索按钮点击
        this.button.addEventListener('click', () => {
            this._performSearch();
        });

        // 表单提交事件
        if (this.input.form) {
            this.input.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this._performSearch();
            });
        }

        // 点击外部关闭建议
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) &&
                !this.suggestionsContainer.contains(e.target)) {
                this._hideSuggestions();
            }
        });
    }

    /**
     * 处理输入
     */
    _handleInput(value) {
        this._filterSuggestions(value);

        // 如果有输入，显示建议
        if (value.trim()) {
            this._showSuggestions();
        } else {
            this._showHistorySuggestions();
        }
    }

    /**
     * 处理键盘事件
     */
    _handleKeydown(e) {
        const items = this.suggestionsContainer.querySelectorAll('.suggestion-item');
        let currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    items[currentIndex].click();
                } else {
                    this._performSearch();
                }
                break;

            case 'Escape':
                this._hideSuggestions();
                this.input.blur();
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    items[currentIndex].classList.remove('selected');
                    items[currentIndex - 1].classList.add('selected');
                    this._scrollToItem(items[currentIndex - 1]);
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < items.length - 1) {
                    if (currentIndex >= 0) {
                        items[currentIndex].classList.remove('selected');
                    }
                    items[currentIndex + 1].classList.add('selected');
                    this._scrollToItem(items[currentIndex + 1]);
                }
                break;
        }
    }

    /**
     * 执行搜索
     */
    _performSearch() {
        const query = this.input.value.trim();
        if (!query) return;

        // 添加到搜索历史
        this._addToHistory(query);

        // 隐藏建议
        this._hideSuggestions();

        // 显示加载状态
        this._showLoading();

        // 执行搜索回调
        this.onSearch(query, this._getSearchFilters());

        // 移除加载状态
        setTimeout(() => {
            this._hideLoading();
        }, 500);
    }

    /**
     * 显示建议
     */
    _showSuggestions() {
        this.suggestionsContainer.classList.remove('hidden');
        this.isExpanded = true;
    }

    /**
     * 隐藏建议
     */
    _hideSuggestions() {
        this.suggestionsContainer.classList.add('hidden');
        this.isExpanded = false;
    }

    /**
     * 显示历史建议
     */
    _showHistorySuggestions() {
        const history = this._getFilteredHistory();
        if (history.length === 0) {
            this._hideSuggestions();
            return;
        }

        const items = history.map(item => `
            <div class="suggestion-item history-item" data-query="${this._escapeHtml(item)}">
                <i class="icon">🕐</i>
                <span class="suggestion-text">${this._escapeHtml(item)}</span>
                <button class="remove-history-btn" data-query="${this._escapeHtml(item)}">×</button>
            </div>
        `).join('');

        this.suggestionsContainer.innerHTML = `
            <div class="suggestions-header">
                <span>搜索历史</span>
                <button class="clear-history-btn">清除全部</button>
            </div>
            <div class="suggestions-list">
                ${items}
            </div>
        `;

        this._bindSuggestionEvents();
    }

    /**
     * 过滤建议
     */
    _filterSuggestions(query) {
        if (!query.trim()) {
            this._showHistorySuggestions();
            return;
        }

        // 基于输入内容过滤历史
        const filteredHistory = this.searchHistory.filter(item =>
            item.toLowerCase().includes(query.toLowerCase())
        );

        if (filteredHistory.length > 0) {
            const items = filteredHistory.map(item => `
                <div class="suggestion-item history-item" data-query="${this._escapeHtml(item)}">
                    <i class="icon">🕐</i>
                    <span class="suggestion-text">${this._highlightMatch(item, query)}</span>
                </div>
            `).join('');

            this.suggestionsContainer.innerHTML = `
                <div class="suggestions-header">
                    <span>搜索历史</span>
                </div>
                <div class="suggestions-list">
                    ${items}
                </div>
            `;
        } else {
            this.suggestionsContainer.innerHTML = `
                <div class="suggestions-empty">
                    <span>暂无搜索建议</span>
                </div>
            `;
        }

        this._bindSuggestionEvents();
    }

    /**
     * 绑定建议项事件
     */
    _bindSuggestionEvents() {
        // 建议项点击
        this.suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                this.input.value = query;
                this._performSearch();
            });
        });

        // 删除历史项
        this.suggestionsContainer.querySelectorAll('.remove-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const query = btn.dataset.query;
                this._removeFromHistory(query);
                this._showHistorySuggestions();
            });
        });

        // 清除历史
        const clearBtn = this.suggestionsContainer.querySelector('.clear-history-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this._clearHistory();
                this._hideSuggestions();
            });
        }
    }

    /**
     * 滚动到指定项
     */
    _scrollToItem(item) {
        const container = this.suggestionsContainer.querySelector('.suggestions-list');
        if (container && item) {
            container.scrollTop = item.offsetTop - container.offsetTop;
        }
    }

    /**
     * 高亮匹配文本
     */
    _highlightMatch(text, query) {
        const regex = new RegExp(`(${this._escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * 获取搜索过滤器
     */
    _getSearchFilters() {
        // 这里可以从UI获取过滤器设置
        return {
            fileTypes: [],
            includeContent: true,
            includeNames: true
        };
    }

    /**
     * 加载搜索历史
     */
    _loadSearchHistory() {
        try {
            const stored = localStorage.getItem('speckit_search_history');
            if (stored) {
                this.searchHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('加载搜索历史失败:', error);
            this.searchHistory = [];
        }
    }

    /**
     * 保存搜索历史
     */
    _saveSearchHistory() {
        try {
            localStorage.setItem('speckit_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('保存搜索历史失败:', error);
        }
    }

    /**
     * 添加到历史
     */
    _addToHistory(query) {
        // 移除重复项
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        // 添加到开头
        this.searchHistory.unshift(query);
        // 限制数量
        this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        // 保存
        this._saveSearchHistory();
    }

    /**
     * 从历史中移除
     */
    _removeFromHistory(query) {
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        this._saveSearchHistory();
    }

    /**
     * 清除历史
     */
    _clearHistory() {
        this.searchHistory = [];
        this._saveSearchHistory();
    }

    /**
     * 获取过滤后的历史
     */
    _getFilteredHistory() {
        return this.searchHistory.slice(0, 5); // 最多显示5个
    }

    /**
     * 显示加载状态
     */
    _showLoading() {
        this.loadingIndicator.classList.remove('hidden');
        this.input.disabled = true;
        this.button.disabled = true;
    }

    /**
     * 隐藏加载状态
     */
    _hideLoading() {
        this.loadingIndicator.classList.add('hidden');
        this.input.disabled = false;
        this.button.disabled = false;
    }

    /**
     * 设置焦点
     */
    focus() {
        this.input.focus();
    }

    /**
     * 获取当前值
     */
    getValue() {
        return this.input.value;
    }

    /**
     * 设置值
     */
    setValue(value) {
        this.input.value = value;
    }

    /**
     * 清空输入
     */
    clear() {
        this.input.value = '';
        this._hideSuggestions();
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
window.SearchBox = SearchBox;
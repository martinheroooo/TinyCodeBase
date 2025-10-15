/**
 * 导入表单组件
 *
 * 功能：
 * - Git仓库和本地文件夹导入表单
 * - 表单验证和提交
 * - 错误处理和用户反馈
 */

class ImportForm {
    constructor(options = {}) {
        this.onSubmit = options.onSubmit || (() => {});
        this.onCancel = options.onCancel || (() => {});
        this.isLoading = false;
        this.currentTab = 'git';

        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.bindEvents();
        this.setupValidation();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 模态框关闭事件
        const closeBtn = document.querySelector('.modal-close');
        const modal = document.getElementById('import-dialog');

        closeBtn?.addEventListener('click', () => {
            this.hide();
        });

        // 点击模态框外部关闭
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // 标签页切换事件
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 表单提交事件
        const confirmBtn = document.getElementById('confirm-import-btn');
        confirmBtn?.addEventListener('click', () => {
            this.handleSubmit();
        });

        // 取消按钮事件
        const cancelBtn = document.getElementById('cancel-import-btn');
        cancelBtn?.addEventListener('click', () => {
            this.hide();
        });

        // 回车键提交
        const modalContent = document.querySelector('.modal-content');
        modalContent?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
            }
        });

        // 输入框变化事件
        this.setupInputListeners();
    }

    /**
     * 设置输入监听器
     */
    setupInputListeners() {
        // Git URL输入验证
        const gitUrlInput = document.getElementById('git-url');
        gitUrlInput?.addEventListener('input', (e) => {
            this.validateGitUrl(e.target.value);
        });

        // 本地路径输入验证
        const localPathInput = document.getElementById('local-path');
        localPathInput?.addEventListener('input', (e) => {
            this.validateLocalPath(e.target.value);
        });

        // 项目名称输入
        const projectNameInput = document.getElementById('project-name');
        projectNameInput?.addEventListener('input', (e) => {
            this.validateProjectName(e.target.value);
        });

        // 自动生成项目名称
        gitUrlInput?.addEventListener('blur', (e) => {
            if (!document.getElementById('project-name').value && e.target.value) {
                this.generateProjectNameFromUrl(e.target.value);
            }
        });

        localPathInput?.addEventListener('blur', (e) => {
            if (!document.getElementById('project-name').value && e.target.value) {
                this.generateProjectNameFromPath(e.target.value);
            }
        });
    }

    /**
     * 设置验证
     */
    setupValidation() {
        this.validators = {
            git: {
                url: (value) => this.validateGitUrl(value),
                branch: (value) => this.validateBranch(value)
            },
            local: {
                path: (value) => this.validateLocalPath(value)
            },
            common: {
                projectName: (value) => this.validateProjectName(value)
            }
        };
    }

    /**
     * 切换标签页
     */
    switchTab(tab) {
        if (this.isLoading) return;

        this.currentTab = tab;

        // 更新标签按钮状态
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // 更新标签内容显示
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tab}-tab`);
        });

        // 清除之前的验证消息
        this.clearValidationMessages();
    }

    /**
     * 显示表单
     */
    show() {
        const modal = document.getElementById('import-dialog');
        if (modal) {
            modal.classList.add('active');
            this.resetForm();
            this.focusFirstInput();
        }
    }

    /**
     * 隐藏表单
     */
    hide() {
        const modal = document.getElementById('import-dialog');
        if (modal) {
            modal.classList.remove('active');
        }
        this.onCancel();
    }

    /**
     * 检查表单是否可见
     */
    isVisible() {
        const modal = document.getElementById('import-dialog');
        return modal?.classList.contains('active') || false;
    }

    /**
     * 重置表单
     */
    resetForm() {
        // 清空输入框
        document.getElementById('git-url').value = '';
        document.getElementById('git-branch').value = '';
        document.getElementById('local-path').value = '';
        document.getElementById('project-name').value = '';

        // 重置标签页
        this.switchTab('git');

        // 清除验证消息
        this.clearValidationMessages();

        // 重置加载状态
        this.setLoading(false);
    }

    /**
     * 聚焦第一个输入框
     */
    focusFirstInput() {
        setTimeout(() => {
            const firstInput = this.currentTab === 'git'
                ? document.getElementById('git-url')
                : document.getElementById('local-path');

            firstInput?.focus();
        }, 100);
    }

    /**
     * 设置加载状态
     */
    setLoading(loading) {
        this.isLoading = loading;
        const confirmBtn = document.getElementById('confirm-import-btn');
        const cancelBtn = document.getElementById('cancel-import-btn');

        if (loading) {
            confirmBtn?.classList.add('loading');
            confirmBtn.disabled = true;
            cancelBtn.disabled = true;
            confirmBtn.textContent = '导入中...';
        } else {
            confirmBtn?.classList.remove('loading');
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
            confirmBtn.textContent = '开始导入';
        }
    }

    /**
     * 处理表单提交
     */
    async handleSubmit() {
        if (this.isLoading) return;

        try {
            // 验证表单
            const formData = this.validateForm();
            if (!formData) {
                return;
            }

            // 设置加载状态
            this.setLoading(true);

            // 调用提交回调
            await this.onSubmit(formData);

            // 成功后隐藏表单
            this.hide();
        } catch (error) {
            console.error('表单提交失败:', error);
            this.showError('提交失败: ' + error.message);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * 验证表单
     */
    validateForm() {
        this.clearValidationMessages();

        let formData = {};
        let isValid = true;

        // 验证项目名称
        const projectName = document.getElementById('project-name').value.trim();
        if (!this.validators.common.projectName(projectName)) {
            isValid = false;
        }
        formData.name = projectName;

        // 根据当前标签页验证相应字段
        if (this.currentTab === 'git') {
            const gitUrl = document.getElementById('git-url').value.trim();
            const gitBranch = document.getElementById('git-branch').value.trim();

            if (!this.validators.git.url(gitUrl)) {
                isValid = false;
            }

            formData = {
                ...formData,
                type: 'git',
                source_path: gitUrl,
                branch: gitBranch || null,
                description: `从 ${gitUrl} 导入的项目`
            };
        } else if (this.currentTab === 'local') {
            const localPath = document.getElementById('local-path').value.trim();

            if (!this.validators.local.path(localPath)) {
                isValid = false;
            }

            formData = {
                ...formData,
                type: 'local',
                source_path: localPath,
                branch: null,
                description: `从本地文件夹导入的项目`
            };
        }

        return isValid ? formData : null;
    }

    /**
     * 验证Git URL
     */
    validateGitUrl(url) {
        if (!url) {
            this.showFieldError('git-url', 'Git仓库URL不能为空');
            return false;
        }

        const urlPatterns = [
            /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\.?git?$/,
            /^https:\/\/gitlab\.com\/[\w\-\.]+\/[\w\-\.]+\.?git?$/,
            /^git@github\.com:[\w\-\.]+\/[\w\-\.]+\.git$/,
            /^https:\/\/bitbucket\.org\/[\w\-\.]+\/[\w\-\.]+\.?git?$/,
            /^https:\/\/[\w\-\.]+\/[\w\-\.]+\/[\w\-\.]+\.?git?$/
        ];

        const isValid = urlPatterns.some(pattern => pattern.test(url));
        if (!isValid) {
            this.showFieldError('git-url', '请输入有效的Git仓库URL');
            return false;
        }

        this.clearFieldError('git-url');
        return true;
    }

    /**
     * 验证分支名称
     */
    validateBranch(branch) {
        if (!branch) return true; // 分支是可选的

        // Git分支名称验证规则
        const branchPattern = /^[a-zA-Z0-9\-_\/]+$/;
        if (!branchPattern.test(branch)) {
            this.showFieldError('git-branch', '分支名称包含无效字符');
            return false;
        }

        this.clearFieldError('git-branch');
        return true;
    }

    /**
     * 验证本地路径
     */
    validateLocalPath(path) {
        if (!path) {
            this.showFieldError('local-path', '本地路径不能为空');
            return false;
        }

        // 检查路径格式
        const invalidChars = /[<>:"|?*]/;
        if (invalidChars.test(path)) {
            this.showFieldError('local-path', '路径包含无效字符');
            return false;
        }

        this.clearFieldError('local-path');
        return true;
    }

    /**
     * 验证项目名称
     */
    validateProjectName(name) {
        if (!name) {
            this.showFieldError('project-name', '项目名称不能为空');
            return false;
        }

        if (name.length < 1 || name.length > 255) {
            this.showFieldError('project-name', '项目名称长度必须在1-255字符之间');
            return false;
        }

        const namePattern = /^[a-zA-Z0-9\-_\u4e00-\u9fa5\s]+$/;
        if (!namePattern.test(name)) {
            this.showFieldError('project-name', '项目名称只能包含字母、数字、连字符、下划线和中文');
            return false;
        }

        this.clearFieldError('project-name');
        return true;
    }

    /**
     * 从URL生成项目名称
     */
    generateProjectNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(part => part);

            if (pathParts.length >= 2) {
                const repoName = pathParts[pathParts.length - 1];
                const name = repoName.replace(/\.git$/, '');
                document.getElementById('project-name').value = name;
            }
        } catch (error) {
            console.warn('从URL生成项目名称失败:', error);
        }
    }

    /**
     * 从路径生成项目名称
     */
    generateProjectNameFromPath(path) {
        try {
            const pathParts = path.split(/[/\\]/).filter(part => part);
            const name = pathParts[pathParts.length - 1];
            document.getElementById('project-name').value = name;
        } catch (error) {
            console.warn('从路径生成项目名称失败:', error);
        }
    }

    /**
     * 显示字段错误
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.add('error');

        // 查找或创建错误消息元素
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            field.parentNode.appendChild(errorElement);
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    /**
     * 清除字段错误
     */
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.remove('error');

        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * 清除所有验证消息
     */
    clearValidationMessages() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => {
            msg.style.display = 'none';
        });

        const errorFields = document.querySelectorAll('.error');
        errorFields.forEach(field => {
            field.classList.remove('error');
        });
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        // 可以使用通知组件或其他方式显示错误
        console.error('ImportForm Error:', message);

        // 临时使用alert，后续可以替换为更好的通知组件
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'success');
        } else {
            console.log('ImportForm Success:', message);
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 移除事件监听器
        // 这里可以根据需要添加清理逻辑
    }
}

// 样式定义（如果没有CSS文件）
const styles = `
.error-message {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: none;
}

.error {
    border-color: #dc3545 !important;
}

.loading {
    opacity: 0.6;
    cursor: not-allowed !important;
}

.modal.active {
    display: flex;
}

.tab-pane {
    display: none;
}

.tab-pane.active {
    display: block;
}

.tab-btn.active {
    background: rgba(255, 255, 255, 0.3);
    font-weight: 600;
}
`;

// 如果需要，可以注入样式
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}
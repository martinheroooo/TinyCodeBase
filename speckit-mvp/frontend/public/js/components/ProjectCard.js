/**
 * 项目卡片组件
 *
 * 功能：
 * - 项目卡片渲染
 * - 项目操作事件绑定
 * - 项目状态显示
 */

class ProjectCard {
    constructor(options = {}) {
        this.onView = options.onView || (() => {});
        this.onDelete = options.onDelete || (() => {});
        this.onRegenerate = options.onRegenerate || (() => {});
        this.onExport = options.onExport || (() => {});
    }

    /**
     * 渲染项目卡片
     */
    render(project) {
        const statusColor = this._getStatusColor(project.status);
        const statusText = this._getStatusText(project.status);
        const progressWidth = project.progress || 0;
        const createdAt = new Date(project.created_at).toLocaleString('zh-CN');
        const fileSize = this._formatFileSize(project.total_size || 0);
        const fileCount = project.file_count || 0;

        return `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <div class="project-title">
                        <h3 class="project-name">${this._escapeHtml(project.name)}</h3>
                        <span class="project-type ${project.type}">${project.type === 'git' ? 'Git仓库' : '本地文件夹'}</span>
                    </div>
                    <div class="project-status">
                        <span class="status-indicator ${statusColor}"></span>
                        <span class="status-text">${statusText}</span>
                    </div>
                </div>

                <div class="project-info">
                    <div class="project-meta">
                        <div class="meta-item">
                            <span class="meta-label">源路径:</span>
                            <span class="meta-value" title="${this._escapeHtml(project.source_path)}">
                                ${this._truncatePath(project.source_path)}
                            </span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">创建时间:</span>
                            <span class="meta-value">${createdAt}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">文件数量:</span>
                            <span class="meta-value">${fileCount} 个</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">总大小:</span>
                            <span class="meta-value">${fileSize}</span>
                        </div>
                    </div>

                    ${project.status === 'processing' ? `
                        <div class="project-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressWidth}%"></div>
                            </div>
                            <span class="progress-text">${Math.round(progressWidth)}%</span>
                        </div>
                    ` : ''}
                </div>

                <div class="project-actions">
                    <button class="btn btn-sm btn-primary view-btn" data-project-id="${project.id}">
                        <i class="icon">👁️</i> 查看
                    </button>

                    ${project.status !== 'processing' ? `
                        <button class="btn btn-sm btn-secondary regenerate-btn" data-project-id="${project.id}">
                            <i class="icon">🔄</i> 重新生成
                        </button>

                        <button class="btn btn-sm btn-success export-btn" data-project-id="${project.id}">
                            <i class="icon">📥</i> 导出
                        </button>
                    ` : ''}

                    <button class="btn btn-sm btn-danger delete-btn" data-project-id="${project.id}">
                        <i class="icon">🗑️</i> 删除
                    </button>
                </div>

                ${project.description ? `
                    <div class="project-description">
                        <p>${this._escapeHtml(project.description)}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        document.querySelectorAll('.project-card').forEach(card => {
            const projectId = card.dataset.projectId;

            // 查看按钮
            const viewBtn = card.querySelector('.view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.onView(projectId);
                });
            }

            // 重新生成按钮
            const regenerateBtn = card.querySelector('.regenerate-btn');
            if (regenerateBtn) {
                regenerateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.onRegenerate(projectId);
                });
            }

            // 导出按钮
            const exportBtn = card.querySelector('.export-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // 显示导出格式选择
                    this._showExportDialog(projectId);
                });
            }

            // 删除按钮
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.onDelete(projectId);
                });
            }

            // 卡片点击事件
            card.addEventListener('click', () => {
                this.onView(projectId);
            });
        });
    }

    /**
     * 获取状态颜色
     */
    _getStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'processing': 'info',
            'completed': 'success',
            'failed': 'danger',
            'cancelled': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    /**
     * 获取状态文本
     */
    _getStatusText(status) {
        const texts = {
            'pending': '等待处理',
            'processing': '处理中',
            'completed': '已完成',
            'failed': '处理失败',
            'cancelled': '已取消'
        };
        return texts[status] || '未知状态';
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
     * 截断路径
     */
    _truncatePath(path, maxLength = 50) {
        if (!path) return '';
        if (path.length <= maxLength) return path;
        return '...' + path.substring(path.length - maxLength + 3);
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
     * 显示导出对话框
     */
    _showExportDialog(projectId) {
        const existingDialog = document.querySelector('.export-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialog = document.createElement('div');
        dialog.className = 'modal export-dialog active';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>导出项目文档</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>请选择导出格式：</p>
                    <div class="export-options">
                        <label class="export-option">
                            <input type="radio" name="export-format" value="markdown" checked>
                            <span>Markdown (.md)</span>
                        </label>
                        <label class="export-option">
                            <input type="radio" name="export-format" value="html">
                            <span>HTML (.html)</span>
                        </label>
                        <label class="export-option">
                            <input type="radio" name="export-format" value="pdf">
                            <span>PDF (.pdf)</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-export-btn">取消</button>
                    <button class="btn btn-primary confirm-export-btn">导出</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 绑定事件
        const closeBtn = dialog.querySelector('.modal-close');
        const cancelBtn = dialog.querySelector('.cancel-export-btn');
        const confirmBtn = dialog.querySelector('.confirm-export-btn');

        const closeDialog = () => {
            dialog.remove();
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);

        confirmBtn.addEventListener('click', () => {
            const selectedFormat = dialog.querySelector('input[name="export-format"]:checked').value;
            this.onExport(projectId, selectedFormat);
            closeDialog();
        });

        // 点击外部关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        });
    }
}

// 导出为全局变量
window.ProjectCard = ProjectCard;
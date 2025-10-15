/**
 * 进度条组件
 *
 * 功能：
 * - 进度显示和更新
 * - 任务状态管理
 * - 进度动画效果
 */

class ProgressBar {
    constructor(options = {}) {
        this.container = options.container || document.getElementById('progress-container');
        this.onCancel = options.onCancel || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.isVisible = false;
        this.currentProgress = 0;
        this.currentMessage = '';
        this.animationFrame = null;

        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.bindEvents();
        this.setupAnimation();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 取消按钮事件
        const cancelBtn = document.getElementById('cancel-progress-btn');
        cancelBtn?.addEventListener('click', () => {
            this.handleCancel();
        });

        // ESC键取消
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.handleCancel();
            }
        });
    }

    /**
     * 设置动画
     */
    setupAnimation() {
        // 使用requestAnimationFrame实现平滑动画
        this.animate = (targetProgress, targetMessage) => {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }

            const animateProgress = () => {
                const progressElement = document.getElementById('progress-fill');
                const messageElement = document.getElementById('progress-text');
                const percentElement = document.getElementById('progress-percent');

                if (!progressElement || !messageElement || !percentElement) {
                    return;
                }

                // 计算当前进度和目标进度的差值
                const diff = targetProgress - this.currentProgress;
                const step = Math.max(0.5, Math.abs(diff) * 0.1); // 步长，至少0.5%

                if (Math.abs(diff) > 0.1) {
                    // 更新进度
                    this.currentProgress += diff > 0 ? step : -step;
                    this.currentProgress = Math.max(0, Math.min(100, this.currentProgress));

                    // 更新UI
                    progressElement.style.width = `${this.currentProgress}%`;
                    percentElement.textContent = `${Math.round(this.currentProgress)}%`;

                    // 继续动画
                    this.animationFrame = requestAnimationFrame(animateProgress);
                } else {
                    // 动画完成
                    this.currentProgress = targetProgress;
                    progressElement.style.width = `${targetProgress}%`;
                    percentElement.textContent = `${Math.round(targetProgress)}%`;

                    // 检查是否完成
                    if (targetProgress >= 100) {
                        this.handleComplete();
                    }
                }

                // 更新消息
                if (targetMessage !== this.currentMessage) {
                    this.currentMessage = targetMessage;
                    messageElement.textContent = targetMessage;
                }
            };

            this.animationFrame = requestAnimationFrame(animateProgress);
        };
    }

    /**
     * 显示进度条
     */
    show(title = '正在处理...', initialMessage = '准备中...') {
        if (!this.container) {
            console.warn('进度条容器未找到');
            return;
        }

        // 更新标题
        const titleElement = document.getElementById('progress-title');
        if (titleElement) {
            titleElement.textContent = title;
        }

        // 初始化状态
        this.currentProgress = 0;
        this.currentMessage = initialMessage;
        this.isVisible = true;

        // 显示容器
        this.container.classList.remove('hidden');

        // 初始化UI
        this.updateUI(0, initialMessage);

        // 聚焦取消按钮
        setTimeout(() => {
            const cancelBtn = document.getElementById('cancel-progress-btn');
            cancelBtn?.focus();
        }, 100);
    }

    /**
     * 隐藏进度条
     */
    hide() {
        if (!this.container) return;

        // 取消动画
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // 隐藏容器
        this.container.classList.add('hidden');
        this.isVisible = false;
    }

    /**
     * 更新进度
     */
    update(progress, message = '') {
        if (!this.isVisible) return;

        // 限制进度范围
        progress = Math.max(0, Math.min(100, progress));

        // 使用动画更新
        this.animate(progress, message || this.currentMessage);
    }

    /**
     * 更新UI（直接更新，不使用动画）
     */
    updateUI(progress, message) {
        const progressElement = document.getElementById('progress-fill');
        const messageElement = document.getElementById('progress-text');
        const percentElement = document.getElementById('progress-percent');

        if (progressElement) {
            progressElement.style.width = `${progress}%`;
        }
        if (percentElement) {
            percentElement.textContent = `${Math.round(progress)}%`;
        }
        if (messageElement) {
            messageElement.textContent = message;
        }

        this.currentProgress = progress;
        this.currentMessage = message;
    }

    /**
     * 设置步骤进度
     */
    setSteps(steps, currentStep) {
        if (!steps || steps.length === 0) return;

        const progress = (currentStep / steps.length) * 100;
        const message = steps[currentStep - 1] || '处理中...';

        this.update(progress, message);
    }

    /**
     * 增加进度
     */
    increment(amount = 1, message = '') {
        const newProgress = Math.min(100, this.currentProgress + amount);
        this.update(newProgress, message || this.currentMessage);
    }

    /**
     * 设置完成状态
     */
    setComplete(message = '处理完成') {
        this.update(100, message);
    }

    /**
     * 设置错误状态
     */
    setError(message = '处理失败') {
        if (!this.container) return;

        // 添加错误样式
        this.container.classList.add('error');

        // 更新消息
        this.updateUI(this.currentProgress, message);

        // 隐藏取消按钮
        const cancelBtn = document.getElementById('cancel-progress-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }

        // 更新标题
        const titleElement = document.getElementById('progress-title');
        if (titleElement) {
            titleElement.textContent = '处理失败';
        }
    }

    /**
     * 处理取消操作
     */
    async handleCancel() {
        if (!this.isVisible) return;

        try {
            // 禁用取消按钮防止重复点击
            const cancelBtn = document.getElementById('cancel-progress-btn');
            if (cancelBtn) {
                cancelBtn.disabled = true;
                cancelBtn.textContent = '取消中...';
            }

            // 调用取消回调
            await this.onCancel();

            // 隐藏进度条
            this.hide();
        } catch (error) {
            console.error('取消操作失败:', error);

            // 恢复取消按钮
            const cancelBtn = document.getElementById('cancel-progress-btn');
            if (cancelBtn) {
                cancelBtn.disabled = false;
                cancelBtn.textContent = '取消';
            }
        }
    }

    /**
     * 处理完成操作
     */
    handleComplete() {
        // 延迟一下让用户看到100%的进度
        setTimeout(() => {
            this.onComplete();

            // 自动隐藏进度条
            setTimeout(() => {
                this.hide();
            }, 1000);
        }, 500);
    }

    /**
     * 检查是否可见
     */
    isProgressVisible() {
        return this.isVisible;
    }

    /**
     * 获取当前进度
     */
    getCurrentProgress() {
        return this.currentProgress;
    }

    /**
     * 获取当前消息
     */
    getCurrentMessage() {
        return this.currentMessage;
    }

    /**
     * 创建步骤进度指示器
     */
    createStepIndicator(steps) {
        if (!this.container || !steps || steps.length === 0) return;

        // 查找或创建步骤指示器容器
        let indicatorContainer = this.container.querySelector('.step-indicator');
        if (!indicatorContainer) {
            indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'step-indicator';

            const progressHeader = this.container.querySelector('.progress-header');
            if (progressHeader) {
                progressHeader.appendChild(indicatorContainer);
            }
        }

        // 生成步骤指示器HTML
        const stepsHtml = steps.map((step, index) => `
            <div class="step ${index === 0 ? 'active' : ''}" data-step="${index}">
                <div class="step-number">${index + 1}</div>
                <div class="step-label">${step}</div>
            </div>
        `).join('');

        indicatorContainer.innerHTML = stepsHtml;
    }

    /**
     * 更新步骤指示器
     */
    updateStepIndicator(currentStep) {
        const steps = this.container?.querySelectorAll('.step');
        if (!steps) return;

        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');

            if (stepNumber < currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === currentStep) {
                step.classList.add('active');
            }
        });
    }

    /**
     * 显示估计剩余时间
     */
    showEstimatedTime(remainingSeconds) {
        let indicatorContainer = this.container?.querySelector('.step-indicator');
        if (!indicatorContainer) {
            indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'step-indicator';

            const progressHeader = this.container.querySelector('.progress-header');
            if (progressHeader) {
                progressHeader.appendChild(indicatorContainer);
            }
        }

        // 查找或创建时间指示器
        let timeIndicator = indicatorContainer.querySelector('.time-indicator');
        if (!timeIndicator) {
            timeIndicator = document.createElement('div');
            timeIndicator.className = 'time-indicator';
            indicatorContainer.appendChild(timeIndicator);
        }

        // 格式化时间显示
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const timeText = minutes > 0
            ? `预计剩余时间: ${minutes}分${seconds}秒`
            : `预计剩余时间: ${seconds}秒`;

        timeIndicator.textContent = timeText;
    }

    /**
     * 隐藏时间指示器
     */
    hideEstimatedTime() {
        const timeIndicator = this.container?.querySelector('.time-indicator');
        if (timeIndicator) {
            timeIndicator.style.display = 'none';
        }
    }

    /**
     * 重置进度条状态
     */
    reset() {
        this.currentProgress = 0;
        this.currentMessage = '';
        this.isVisible = false;

        // 移除错误样式
        if (this.container) {
            this.container.classList.remove('error');
        }

        // 显示取消按钮
        const cancelBtn = document.getElementById('cancel-progress-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'block';
            cancelBtn.disabled = false;
            cancelBtn.textContent = '取消';
        }

        // 隐藏时间指示器
        this.hideEstimatedTime();

        // 取消动画
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 取消动画
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        // 移除事件监听器
        // 这里可以根据需要添加清理逻辑

        // 重置状态
        this.reset();
    }
}

// 样式定义
const progressBarStyles = `
.progress-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    z-index: 2000;
    min-width: 400px;
    max-width: 600px;
}

.progress-container.hidden {
    display: none;
}

.progress-container.error {
    border-left: 4px solid #dc3545;
}

.progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.progress-header h4 {
    color: #333;
    font-size: 1.1rem;
    margin: 0;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 1rem;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    width: 0%;
    transition: width 0.3s ease;
    border-radius: 4px;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #666;
    font-size: 0.9rem;
}

.progress-percent {
    font-weight: 600;
    color: #667eea;
}

.step-indicator {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
}

.step {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    opacity: 0.5;
    transition: opacity 0.3s ease;
}

.step.active {
    opacity: 1;
}

.step.completed {
    opacity: 0.8;
}

.step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #e9ecef;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    margin-right: 0.75rem;
}

.step.active .step-number {
    background: #667eea;
    color: white;
}

.step.completed .step-number {
    background: #28a745;
    color: white;
}

.step-label {
    font-size: 0.9rem;
    color: #333;
}

.time-indicator {
    text-align: center;
    color: #666;
    font-size: 0.8rem;
    margin-top: 0.5rem;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-small {
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = progressBarStyles;
    document.head.appendChild(styleElement);
}
/**
 * DOM操作工具函数
 *
 * 功能：
 * - DOM查询和操作
 * - 事件处理
 * - 样式管理
 * - 动画效果
 */

class DOMUtils {
    constructor() {
        this.animationFrame = null;
    }

    /**
     * 查找元素
     */
    $(selector, context = document) {
        return context.querySelector(selector);
    }

    /**
     * 查找所有元素
     */
    $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * 创建元素
     */
    create(tag, attributes = {}, textContent = '') {
        const element = document.createElement(tag);

        // 设置属性
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });

        // 设置文本内容
        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }

    /**
     * 添加类名
     */
    addClass(element, className) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.classList.add(className);
        }
        return element;
    }

    /**
     * 移除类名
     */
    removeClass(element, className) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.classList.remove(className);
        }
        return element;
    }

    /**
     * 切换类名
     */
    toggleClass(element, className) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.classList.toggle(className);
        }
        return element;
    }

    /**
     * 检查是否包含类名
     */
    hasClass(element, className) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        return element ? element.classList.contains(className) : false;
    }

    /**
     * 显示元素
     */
    show(element, display = 'block') {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.style.display = display;
        }
        return element;
    }

    /**
     * 隐藏元素
     */
    hide(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.style.display = 'none';
        }
        return element;
    }

    /**
     * 切换显示/隐藏
     */
    toggle(element, display = 'block') {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.style.display = element.style.display === 'none' ? display : 'none';
        }
        return element;
    }

    /**
     * 设置元素文本
     */
    text(element, content) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.textContent = content;
        }
        return element;
    }

    /**
     * 设置元素HTML
     */
    html(element, content) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.innerHTML = content;
        }
        return element;
    }

    /**
     * 获取元素值
     */
    getValue(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        return element ? element.value : '';
    }

    /**
     * 设置元素值
     */
    setValue(element, value) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.value = value;
        }
        return element;
    }

    /**
     * 添加事件监听器
     */
    on(element, event, handler, options = {}) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.addEventListener(event, handler, options);
        }
        return element;
    }

    /**
     * 移除事件监听器
     */
    off(element, event, handler, options = {}) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.removeEventListener(event, handler, options);
        }
        return element;
    }

    /**
     * 触发自定义事件
     */
    trigger(element, eventName, detail = {}) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            const event = new CustomEvent(eventName, { detail });
            element.dispatchEvent(event);
        }
        return element;
    }

    /**
     * 委托事件处理
     */
    delegate(parent, selector, event, handler) {
        if (typeof parent === 'string') {
            parent = this.$(parent);
        }
        if (parent) {
            parent.addEventListener(event, (e) => {
                const target = e.target.closest(selector);
                if (target && parent.contains(target)) {
                    handler.call(target, e);
                }
            });
        }
        return parent;
    }

    /**
     * 淡入动画
     */
    fadeIn(element, duration = 300) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return element;

        element.style.opacity = 0;
        element.style.display = 'block';

        const start = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = progress;

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
        return element;
    }

    /**
     * 淡出动画
     */
    fadeOut(element, duration = 300) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return element;

        const start = performance.now();
        const startOpacity = parseFloat(window.getComputedStyle(element).opacity);

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = startOpacity * (1 - progress);

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
        return element;
    }

    /**
     * 滑动动画
     */
    slideDown(element, duration = 300) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return element;

        const height = element.scrollHeight;
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        element.style.display = 'block';

        const start = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.height = `${height * progress}px`;

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                element.style.height = 'auto';
                element.style.overflow = '';
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
        return element;
    }

    /**
     * 向上滑动动画
     */
    slideUp(element, duration = 300) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return element;

        const height = element.scrollHeight;
        element.style.height = `${height}px`;
        element.style.overflow = 'hidden';

        const start = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.height = `${height * (1 - progress)}px`;

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
        return element;
    }

    /**
     * 平滑滚动到元素
     */
    scrollTo(element, duration = 300) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return;

        const startPosition = window.pageYOffset;
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const distance = targetPosition - startPosition;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            // 使用easeInOutCubic缓动函数
            const easeProgress = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            window.scrollTo(0, startPosition + distance * easeProgress);

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * 平滑滚动到顶部
     */
    scrollToTop(duration = 300) {
        const startPosition = window.pageYOffset;
        const start = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            const easeProgress = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            window.scrollTo(0, startPosition * (1 - easeProgress));

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * 取消动画
     */
    cancelAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * 等待DOM加载完成
     */
    ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    /**
     * 等待元素加载
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = this.$(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = this.$(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // 设置超时
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`元素 ${selector} 在 ${timeout}ms 内未找到`));
            }, timeout);
        });
    }

    /**
     * 复制文本到剪贴板
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // 降级方案
                const textArea = this.create('textarea', {
                    style: {
                        position: 'fixed',
                        top: '-9999px',
                        left: '-9999px'
                    }
                });
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            return true;
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            return false;
        }
    }

    /**
     * 获取元素相对于页面的位置
     */
    getOffset(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return { top: 0, left: 0 };

        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * 检查元素是否在视口中
     */
    isInViewport(element) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }

    /**
     * 获取元素的计算样式
     */
    getComputedStyle(element, property = null) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (!element) return null;

        const styles = window.getComputedStyle(element);
        return property ? styles[property] : styles;
    }

    /**
     * 设置CSS变量
     */
    setCSSVariable(name, value, element = document.documentElement) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.style.setProperty(`--${name}`, value);
        }
    }

    /**
     * 获取CSS变量
     */
    getCSSVariable(name, element = document.documentElement) {
        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            return getComputedStyle(element).getPropertyValue(`--${name}`).trim();
        }
        return null;
    }
}

// 创建全局实例
const domUtils = new DOMUtils();

// 导出为全局变量
window.DOMUtils = DOMUtils;
window.domUtils = domUtils;
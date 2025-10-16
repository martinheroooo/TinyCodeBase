/**
 * 前端功能验收测试脚本
 *
 * 模拟浏览器行为，测试前端关键功能
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// 测试配置
const TEST_CONFIG = {
    frontendUrl: 'http://localhost:3000',
    backendUrl: 'http://localhost:3001',
    testProject: {
        name: '最终测试项目',
        gitUrl: 'https://github.com/octocat/Hello-World.git',
        description: '产品经理最终验收测试项目'
    },
    timeout: 30000
};

class FrontendTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
    }

    /**
     * 初始化浏览器
     */
    async init() {
        console.log('🚀 启动前端验收测试...');

        this.browser = await puppeteer.launch({
            headless: false, // 显示浏览器窗口以便观察
            defaultViewport: null,
            args: ['--start-maximized']
        });

        this.page = await this.browser.newPage();

        // 设置超时时间
        this.page.setDefaultTimeout(TEST_CONFIG.timeout);

        // 监听控制台输出
        this.page.on('console', msg => {
            console.log('浏览器控制台:', msg.text());
        });

        // 监听页面错误
        this.page.on('pageerror', error => {
            console.error('页面错误:', error.message);
            this.addTestResult('页面错误检测', false, error.message);
        });

        // 监听请求失败
        this.page.on('requestfailed', request => {
            console.error('请求失败:', request.url(), request.failure());
            this.addTestResult('网络请求检测', false, `请求失败: ${request.url()}`);
        });
    }

    /**
     * 访问应用首页
     */
    async visitHomepage() {
        try {
            console.log('📱 访问应用首页...');
            await this.page.goto(TEST_CONFIG.frontendUrl, { waitUntil: 'networkidle2' });

            // 检查页面标题
            const title = await this.page.title();
            const titleValid = title.includes('轻量级AI代码知识库');

            this.addTestResult('页面加载测试', titleValid,
                titleValid ? '页面加载成功，标题正确' : `页面标题错误: ${title}`);

            // 等待关键元素加载
            await this.page.waitForSelector('#import-project-btn', { timeout: 5000 });

            return true;
        } catch (error) {
            this.addTestResult('页面访问测试', false, error.message);
            return false;
        }
    }

    /**
     * 测试点击"开始导入"按钮
     */
    async testImportButtonClick() {
        try {
            console.log('🔘 测试"开始导入"按钮...');

            // 点击开始导入按钮
            await this.page.click('#import-project-btn');

            // 等待对话框显示
            await this.page.waitForSelector('#import-dialog.active', { timeout: 5000 });

            // 检查对话框是否可见
            const dialogVisible = await this.page.evaluate(() => {
                const dialog = document.getElementById('import-dialog');
                return dialog && dialog.classList.contains('active');
            });

            this.addTestResult('导入按钮点击测试', dialogVisible,
                dialogVisible ? '导入对话框成功弹出' : '导入对话框未弹出');

            return dialogVisible;
        } catch (error) {
            this.addTestResult('导入按钮点击测试', false, error.message);
            return false;
        }
    }

    /**
     * 测试表单验证功能
     */
    async testFormValidation() {
        try {
            console.log('✅ 测试表单验证功能...');

            let validationPassed = true;
            const validationResults = [];

            // 测试空项目名称验证
            await this.page.type('#project-name', '');
            await this.page.click('#confirm-import-btn');

            // 等待验证错误显示
            await this.page.waitForTimeout(1000);

            const projectNameError = await this.page.evaluate(() => {
                const errorElement = document.querySelector('#project-name').parentElement.querySelector('.error-message');
                return errorElement && errorElement.style.display !== 'none';
            });

            validationResults.push({
                field: '项目名称空验证',
                passed: projectNameError,
                message: projectNameError ? '正确显示错误信息' : '未显示错误信息'
            });

            // 测试无效Git URL验证
            await this.page.type('#git-url', 'invalid-url');
            await this.page.click('#confirm-import-btn');
            await this.page.waitForTimeout(1000);

            const gitUrlError = await this.page.evaluate(() => {
                const errorElement = document.querySelector('#git-url').parentElement.querySelector('.error-message');
                return errorElement && errorElement.style.display !== 'none';
            });

            validationResults.push({
                field: 'Git URL格式验证',
                passed: gitUrlError,
                message: gitUrlError ? '正确显示URL错误信息' : '未显示URL错误信息'
            });

            // 测试有效输入
            await this.page.type('#project-name', TEST_CONFIG.testProject.name);
            await this.page.type('#git-url', TEST_CONFIG.testProject.gitUrl);
            await this.page.waitForTimeout(500);

            const validInputNoError = await this.page.evaluate(() => {
                const projectError = document.querySelector('#project-name').parentElement.querySelector('.error-message');
                const urlError = document.querySelector('#git-url').parentElement.querySelector('.error-message');
                return (!projectError || projectError.style.display === 'none') &&
                       (!urlError || urlError.style.display === 'none');
            });

            validationResults.push({
                field: '有效输入验证',
                passed: validInputNoError,
                message: validInputNoError ? '有效输入无错误信息' : '有效输入仍有错误信息'
            });

            // 综合评估
            const allPassed = validationResults.every(r => r.passed);
            validationPassed = allPassed;

            this.addTestResult('表单验证测试', validationPassed,
                validationPassed ? '所有验证功能正常' : '部分验证功能异常',
                validationResults);

            return validationPassed;
        } catch (error) {
            this.addTestResult('表单验证测试', false, error.message);
            return false;
        }
    }

    /**
     * 测试项目创建API请求
     */
    async testProjectCreation() {
        try {
            console.log('📤 测试项目创建API请求...');

            // 填写有效表单数据
            await this.page.evaluate((testProject) => {
                document.getElementById('project-name').value = testProject.name;
                document.getElementById('git-url').value = testProject.gitUrl;
            }, TEST_CONFIG.testProject);

            // 拦截网络请求
            let apiRequestSuccessful = false;
            let apiResponse = null;

            this.page.on('response', response => {
                if (response.url().includes('/api/v1/projects')) {
                    apiResponse = response;
                    apiRequestSuccessful = response.status() === 200;
                }
            });

            // 点击提交按钮
            await this.page.click('#confirm-import-btn');

            // 等待API请求完成
            await this.page.waitForTimeout(3000);

            // 检查API请求是否成功
            this.addTestResult('项目创建API测试', apiRequestSuccessful,
                apiRequestSuccessful ? 'API请求成功发送' : 'API请求失败',
                { status: apiResponse?.status(), url: apiResponse?.url() });

            return apiRequestSuccessful;
        } catch (error) {
            this.addTestResult('项目创建API测试', false, error.message);
            return false;
        }
    }

    /**
     * 测试进度条显示
     */
    async testProgressBarDisplay() {
        try {
            console.log('📊 测试进度条显示...');

            // 等待进度条显示
            await this.page.waitForSelector('#progress-container:not(.hidden)', { timeout: 5000 });

            // 检查进度条元素是否存在
            const progressVisible = await this.page.evaluate(() => {
                const container = document.getElementById('progress-container');
                const title = document.getElementById('progress-title');
                const fill = document.getElementById('progress-fill');
                const text = document.getElementById('progress-text');

                return container && !container.classList.contains('hidden') &&
                       title && fill && text;
            });

            this.addTestResult('进度条显示测试', progressVisible,
                progressVisible ? '进度条正常显示' : '进度条未显示或元素缺失');

            return progressVisible;
        } catch (error) {
            this.addTestResult('进度条显示测试', false, error.message);
            return false;
        }
    }

    /**
     * 测试页面导航
     */
    async testPageNavigation() {
        try {
            console.log('🧭 测试页面导航功能...');

            let navigationPassed = true;
            const navigationResults = [];

            // 测试切换到项目管理页面
            await this.page.click('[data-page="projects"]');
            await this.page.waitForTimeout(1000);

            const projectsPageActive = await this.page.evaluate(() => {
                const projectsPage = document.getElementById('projects-page');
                const projectsBtn = document.querySelector('[data-page="projects"]');
                return projectsPage && projectsPage.classList.contains('active') &&
                       projectsBtn && projectsBtn.classList.contains('active');
            });

            navigationResults.push({
                page: '项目管理页面',
                passed: projectsPageActive,
                message: projectsPageActive ? '页面切换成功' : '页面切换失败'
            });

            // 测试切换到搜索页面
            await this.page.click('[data-page="search"]');
            await this.page.waitForTimeout(1000);

            const searchPageActive = await this.page.evaluate(() => {
                const searchPage = document.getElementById('search-page');
                const searchBtn = document.querySelector('[data-page="search"]');
                return searchPage && searchPage.classList.contains('active') &&
                       searchBtn && searchBtn.classList.contains('active');
            });

            navigationResults.push({
                page: '搜索页面',
                passed: searchPageActive,
                message: searchPageActive ? '搜索页面切换成功' : '搜索页面切换失败'
            });

            // 测试返回仪表板
            await this.page.click('[data-page="dashboard"]');
            await this.page.waitForTimeout(1000);

            const dashboardActive = await this.page.evaluate(() => {
                const dashboardPage = document.getElementById('dashboard-page');
                const dashboardBtn = document.querySelector('[data-page="dashboard"]');
                return dashboardPage && dashboardPage.classList.contains('active') &&
                       dashboardBtn && dashboardBtn.classList.contains('active');
            });

            navigationResults.push({
                page: '仪表板页面',
                passed: dashboardActive,
                message: dashboardActive ? '仪表板切换成功' : '仪表板切换失败'
            });

            // 综合评估
            const allPassed = navigationResults.every(r => r.passed);
            navigationPassed = allPassed;

            this.addTestResult('页面导航测试', navigationPassed,
                navigationPassed ? '所有页面导航正常' : '部分页面导航异常',
                navigationResults);

            return navigationPassed;
        } catch (error) {
            this.addTestResult('页面导航测试', false, error.message);
            return false;
        }
    }

    /**
     * 测试搜索功能
     */
    async testSearchFunctionality() {
        try {
            console.log('🔍 测试搜索功能...');

            // 切换到搜索页面
            await this.page.click('[data-page="search"]');
            await this.page.waitForTimeout(1000);

            // 检查搜索元素是否存在
            const searchElementsExist = await this.page.evaluate(() => {
                const searchInput = document.getElementById('search-input');
                const searchBtn = document.getElementById('search-btn');
                const filters = document.querySelectorAll('.search-filters input[type="checkbox"]');

                return searchInput && searchBtn && filters.length > 0;
            });

            if (searchElementsExist) {
                // 测试搜索输入
                await this.page.type('#search-input', 'test search');

                // 检查输入是否成功
                const searchInputFilled = await this.page.evaluate(() => {
                    return document.getElementById('search-input').value === 'test search';
                });

                this.addTestResult('搜索功能测试', searchInputFilled,
                    searchInputFilled ? '搜索功能正常，输入成功' : '搜索输入功能异常');

                return searchInputFilled;
            } else {
                this.addTestResult('搜索功能测试', false, '搜索页面元素缺失');
                return false;
            }
        } catch (error) {
            this.addTestResult('搜索功能测试', false, error.message);
            return false;
        }
    }

    /**
     * 检查浏览器控制台错误
     */
    async checkConsoleErrors() {
        try {
            console.log('🔍 检查浏览器控制台错误...');

            // 获取控制台消息
            const consoleMessages = await this.page.evaluate(() => {
                return window.consoleMessages || [];
            });

            // 检查是否有错误
            const hasErrors = consoleMessages.some(msg => msg.type === 'error');

            this.addTestResult('控制台错误检查', !hasErrors,
                hasErrors ? '发现控制台错误' : '无控制台错误',
                { messages: consoleMessages });

            return !hasErrors;
        } catch (error) {
            this.addTestResult('控制台错误检查', false, error.message);
            return false;
        }
    }

    /**
     * 添加测试结果
     */
    addTestResult(testName, passed, message, details = null) {
        const result = {
            test: testName,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        };

        this.testResults.push(result);

        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);

        if (details) {
            console.log('   详情:', details);
        }
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        console.log('\n📋 前端验收测试报告');
        console.log('='.repeat(50));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;

        console.log(`\n📊 测试统计:`);
        console.log(`   总测试数: ${totalTests}`);
        console.log(`   通过: ${passedTests}`);
        console.log(`   失败: ${failedTests}`);
        console.log(`   通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        console.log(`\n📝 详细结果:`);
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`   ${status} ${result.test}: ${result.message}`);
        });

        // 生成最终结论
        const allCriticalPassed = this.testResults
            .filter(r => ['页面加载测试', '导入按钮点击测试', '表单验证测试', '项目创建API测试'].includes(r.test))
            .every(r => r.passed);

        console.log(`\n🎯 最终验收结论:`);
        if (allCriticalPassed && failedTests === 0) {
            console.log('   🎉 优秀！所有功能测试通过，产品准备上线');
        } else if (allCriticalPassed) {
            console.log('   ✅ 良好！核心功能正常，存在次要问题需要优化');
        } else {
            console.log('   ⚠️  需要修复！核心功能存在问题，建议修复后重新验收');
        }

        return {
            totalTests,
            passedTests,
            failedTests,
            passRate: (passedTests / totalTests) * 100,
            allCriticalPassed,
            results: this.testResults
        };
    }

    /**
     * 运行完整测试流程
     */
    async runFullTest() {
        try {
            await this.init();

            // 按顺序执行测试
            await this.visitHomepage();
            await this.testImportButtonClick();
            await this.testFormValidation();
            await this.testProjectCreation();
            await this.testProgressBarDisplay();
            await this.testPageNavigation();
            await this.testSearchFunctionality();
            await this.checkConsoleErrors();

            // 生成报告
            const report = this.generateReport();

            return report;
        } catch (error) {
            console.error('测试执行失败:', error);
            return null;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// 执行测试
async function main() {
    const tester = new FrontendTester();
    const report = await tester.runFullTest();

    if (report) {
        // 将报告保存到文件
        const fs = require('fs');
        const reportPath = '/Users/lizhe/SEO/workspace/TinyCodeBase/speckit-mvp/frontend-test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = FrontendTester;
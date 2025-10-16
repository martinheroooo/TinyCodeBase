/**
 * 产品验收测试脚本
 * 测试轻量级AI代码知识库的核心功能
 */

const puppeteer = require('puppeteer');

class ProductAcceptanceTest {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.browser = null;
        this.page = null;
        this.testResults = [];
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();

        // 设置视窗大小
        await this.page.setViewport({ width: 1200, height: 800 });

        // 监听控制台输出
        this.page.on('console', msg => {
            console.log('浏览器控制台:', msg.type(), msg.text());
        });

        // 监听页面错误
        this.page.on('pageerror', error => {
            console.error('页面错误:', error.message);
            this.addTestResult('JavaScript错误检测', false, error.message);
        });
    }

    async runAllTests() {
        console.log('🚀 开始产品验收测试...');

        try {
            await this.testPageLoad();
            await this.testNavigation();
            await this.testImportDialog();
            await this.testImportForm();
            await this.testSearchFunction();
            await this.testProjectManagement();

            this.generateTestReport();

        } catch (error) {
            console.error('测试过程中发生错误:', error);
        } finally {
            await this.browser.close();
        }
    }

    async testPageLoad() {
        console.log('\n📋 测试1: 页面加载验证');

        try {
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

            // 检查页面标题
            const title = await this.page.title();
            const titleCorrect = title === '轻量级AI代码知识库';
            this.addTestResult('页面标题正确', titleCorrect, title);

            // 检查主要元素是否存在
            const elements = [
                '#app',
                '.header',
                '.logo',
                '.nav',
                '#dashboard-page',
                '#projects-page',
                '#search-page',
                '#import-project-btn',
                '#import-dialog'
            ];

            for (const selector of elements) {
                const exists = await this.page.$(selector) !== null;
                this.addTestResult(`元素存在: ${selector}`, exists, exists ? '存在' : '不存在');
            }

            // 检查JavaScript是否正常执行
            const appInitialized = await this.page.evaluate(() => {
                return window.app !== undefined;
            });
            this.addTestResult('应用初始化成功', appInitialized, appInitialized ? 'app对象存在' : 'app对象不存在');

            console.log('✅ 页面加载测试完成');

        } catch (error) {
            console.error('❌ 页面加载测试失败:', error);
            this.addTestResult('页面加载', false, error.message);
        }
    }

    async testNavigation() {
        console.log('\n📋 测试2: 页面导航功能');

        try {
            // 测试导航到项目管理页面
            await this.page.click('[data-page="projects"]');
            await this.page.waitForTimeout(500);

            const projectsPageActive = await this.page.$eval('#projects-page', el =>
                el.classList.contains('active'));
            this.addTestResult('导航到项目管理页面', projectsPageActive,
                projectsPageActive ? '成功激活' : '激活失败');

            // 测试导航到搜索页面
            await this.page.click('[data-page="search"]');
            await this.page.waitForTimeout(500);

            const searchPageActive = await this.page.$eval('#search-page', el =>
                el.classList.contains('active'));
            this.addTestResult('导航到搜索页面', searchPageActive,
                searchPageActive ? '成功激活' : '激活失败');

            // 测试导航回到仪表板
            await this.page.click('[data-page="dashboard"]');
            await this.page.waitForTimeout(500);

            const dashboardPageActive = await this.page.$eval('#dashboard-page', el =>
                el.classList.contains('active'));
            this.addTestResult('导航回仪表板', dashboardPageActive,
                dashboardPageActive ? '成功激活' : '激活失败');

            console.log('✅ 页面导航测试完成');

        } catch (error) {
            console.error('❌ 页面导航测试失败:', error);
            this.addTestResult('页面导航', false, error.message);
        }
    }

    async testImportDialog() {
        console.log('\n📋 测试3: 导入对话框功能');

        try {
            // 确保在仪表板页面
            await this.page.click('[data-page="dashboard"]');
            await this.page.waitForTimeout(500);

            // 点击开始导入按钮
            await this.page.click('#import-project-btn');
            await this.page.waitForTimeout(500);

            // 检查对话框是否显示
            const dialogVisible = await this.page.$eval('#import-dialog', el =>
                el.classList.contains('active'));
            this.addTestResult('导入对话框显示', dialogVisible,
                dialogVisible ? '对话框成功显示' : '对话框未显示');

            // 检查表单元素
            const formElements = [
                '#git-url',
                '#git-branch',
                '#project-name',
                '#confirm-import-btn',
                '#cancel-import-btn'
            ];

            for (const selector of formElements) {
                const exists = await this.page.$(selector) !== null;
                this.addTestResult(`表单元素存在: ${selector}`, exists, exists ? '存在' : '不存在');
            }

            // 测试关闭对话框
            await this.page.click('#cancel-import-btn');
            await this.page.waitForTimeout(500);

            const dialogHidden = await this.page.$eval('#import-dialog', el =>
                !el.classList.contains('active'));
            this.addTestResult('导入对话框关闭', dialogHidden,
                dialogHidden ? '对话框成功关闭' : '对话框未关闭');

            console.log('✅ 导入对话框测试完成');

        } catch (error) {
            console.error('❌ 导入对话框测试失败:', error);
            this.addTestResult('导入对话框', false, error.message);
        }
    }

    async testImportForm() {
        console.log('\n📋 测试4: 导入表单功能');

        try {
            // 打开导入对话框
            await this.page.click('#import-project-btn');
            await this.page.waitForTimeout(500);

            // 填写测试数据
            await this.page.type('#project-name', '产品验收测试项目');
            await this.page.type('#git-url', 'https://github.com/octocat/Hello-World.git');
            await this.page.type('#git-branch', 'main');

            // 验证输入内容
            const projectName = await this.page.$eval('#project-name', el => el.value);
            const gitUrl = await this.page.$eval('#git-url', el => el.value);
            const gitBranch = await this.page.$eval('#git-branch', el => el.value);

            this.addTestResult('项目名称输入正确', projectName === '产品验收测试项目', projectName);
            this.addTestResult('Git URL输入正确', gitUrl === 'https://github.com/octocat/Hello-World.git', gitUrl);
            this.addTestResult('Git分支输入正确', gitBranch === 'main', gitBranch);

            // 测试标签切换
            await this.page.click('[data-tab="local"]');
            await this.page.waitForTimeout(300);

            const localTabActive = await this.page.$eval('#local-tab', el =>
                el.classList.contains('active'));
            this.addTestResult('本地文件夹标签切换', localTabActive,
                localTabActive ? '成功切换' : '切换失败');

            // 切换回Git标签
            await this.page.click('[data-tab="git"]');
            await this.page.waitForTimeout(300);

            const gitTabActive = await this.page.$eval('#git-tab', el =>
                el.classList.contains('active'));
            this.addTestResult('Git仓库标签切换', gitTabActive,
                gitTabActive ? '成功切换' : '切换失败');

            console.log('✅ 导入表单测试完成');

        } catch (error) {
            console.error('❌ 导入表单测试失败:', error);
            this.addTestResult('导入表单', false, error.message);
        }
    }

    async testSearchFunction() {
        console.log('\n📋 测试5: 搜索功能');

        try {
            // 导航到搜索页面
            await this.page.click('[data-page="search"]');
            await this.page.waitForTimeout(500);

            // 检查搜索元素
            const searchElements = [
                '#search-input',
                '#search-btn',
                '.search-filters'
            ];

            for (const selector of searchElements) {
                const exists = await this.page.$(selector) !== null;
                this.addTestResult(`搜索元素存在: ${selector}`, exists, exists ? '存在' : '不存在');
            }

            // 输入搜索关键词
            await this.page.type('#search-input', 'function');

            // 检查输入内容
            const searchValue = await this.page.$eval('#search-input', el => el.value);
            this.addTestResult('搜索输入功能', searchValue === 'function', searchValue);

            // 测试过滤器
            const filterCheckboxes = [
                '#filter-javascript',
                '#filter-python',
                '#filter-java'
            ];

            for (const selector of filterCheckboxes) {
                const exists = await this.page.$(selector) !== null;
                if (exists) {
                    await this.page.click(selector);
                    await this.page.waitForTimeout(100);
                    const checked = await this.page.$eval(selector, el => el.checked);
                    this.addTestResult(`过滤器功能: ${selector}`, checked,
                        checked ? '成功勾选' : '勾选失败');
                } else {
                    this.addTestResult(`过滤器存在: ${selector}`, false, '不存在');
                }
            }

            console.log('✅ 搜索功能测试完成');

        } catch (error) {
            console.error('❌ 搜索功能测试失败:', error);
            this.addTestResult('搜索功能', false, error.message);
        }
    }

    async testProjectManagement() {
        console.log('\n📋 测试6: 项目管理功能');

        try {
            // 导航到项目管理页面
            await this.page.click('[data-page="projects"]');
            await this.page.waitForTimeout(1000); // 等待项目列表加载

            // 检查项目列表容器
            const projectsListExists = await this.page.$('#projects-list') !== null;
            this.addTestResult('项目列表容器存在', projectsListExists,
                projectsListExists ? '存在' : '不存在');

            // 检查新建项目按钮
            const newProjectBtnExists = await this.page.$('#new-project-btn') !== null;
            this.addTestResult('新建项目按钮存在', newProjectBtnExists,
                newProjectBtnExists ? '存在' : '不存在');

            // 测试新建项目按钮
            await this.page.click('#new-project-btn');
            await this.page.waitForTimeout(500);

            const importDialogVisible = await this.page.$eval('#import-dialog', el =>
                el.classList.contains('active'));
            this.addTestResult('新建项目打开导入对话框', importDialogVisible,
                importDialogVisible ? '成功打开' : '打开失败');

            // 关闭对话框
            await this.page.click('#cancel-import-btn');
            await this.page.waitForTimeout(500);

            console.log('✅ 项目管理功能测试完成');

        } catch (error) {
            console.error('❌ 项目管理功能测试失败:', error);
            this.addTestResult('项目管理功能', false, error.message);
        }
    }

    addTestResult(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed: passed,
            details: details,
            timestamp: new Date().toISOString()
        });

        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${testName}: ${details}`);
    }

    generateTestReport() {
        console.log('\n📊 产品验收测试报告');
        console.log('=' .repeat(50));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const passRate = ((passedTests / totalTests) * 100).toFixed(1);

        console.log(`总测试数: ${totalTests}`);
        console.log(`通过测试: ${passedTests}`);
        console.log(`失败测试: ${failedTests}`);
        console.log(`通过率: ${passRate}%`);

        console.log('\n📋 详细测试结果:');
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${result.name}`);
            console.log(`   详情: ${result.details}`);
        });

        // 生成验收结论
        console.log('\n🎯 产品验收结论:');
        if (passRate >= 90) {
            console.log('✅ 产品验收通过 - 核心功能运行正常，可以发布');
        } else if (passRate >= 70) {
            console.log('⚠️  产品部分通过 - 存在一些问题需要修复，建议完善后发布');
        } else {
            console.log('❌ 产品验收未通过 - 存在严重问题，需要修复后重新测试');
        }

        // 保存测试报告到文件
        const reportData = {
            testTime: new Date().toISOString(),
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                passRate: passRate
            },
            results: this.testResults
        };

        require('fs').writeFileSync(
            '/Users/lizhe/SEO/workspace/TinyCodeBase/speckit-mvp/test-report.json',
            JSON.stringify(reportData, null, 2)
        );

        console.log('\n📁 测试报告已保存到: test-report.json');
    }
}

// 运行测试
const test = new ProductAcceptanceTest();
test.init().then(() => {
    test.runAllTests();
}).catch(error => {
    console.error('测试初始化失败:', error);
});
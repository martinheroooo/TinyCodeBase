/**
 * 前端功能测试脚本
 * 用于测试轻量级AI代码知识库Web应用的核心功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 测试结果记录
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

// 测试工具函数
function assert(condition, message) {
    if (condition) {
        testResults.passed.push(`✅ ${message}`);
        console.log(`✅ ${message}`);
        return true;
    } else {
        testResults.failed.push(`❌ ${message}`);
        console.error(`❌ ${message}`);
        return false;
    }
}

function warn(message) {
    testResults.warnings.push(`⚠️ ${message}`);
    console.warn(`⚠️ ${message}`);
}

// 测试函数
async function testPageLoad() {
    console.log('\n🧪 测试页面加载...');

    try {
        const response = await axios.get(BASE_URL);

        assert(response.status === 200, '页面正常加载 (HTTP 200)');
        assert(response.headers['content-type'].includes('text/html'), '返回HTML内容');
        assert(response.data.includes('轻量级AI代码知识库'), '页面包含正确标题');
        assert(response.data.includes('import-project-btn'), '页面包含导入按钮');
        assert(response.data.includes('ImportForm.js'), '页面正确加载ImportForm组件');

        return true;
    } catch (error) {
        assert(false, `页面加载失败: ${error.message}`);
        return false;
    }
}

async function testJavaScriptFiles() {
    console.log('\n🧪 测试JavaScript文件加载...');

    const jsFiles = [
        '/js/utils/api.js',
        '/js/utils/dom.js',
        '/js/utils/storage.js',
        '/js/components/ImportForm.js',
        '/js/components/ProgressBar.js',
        '/js/components/SearchBox.js',
        '/js/components/ProjectCard.js',
        '/js/components/SearchResult.js',
        '/js/app.js'
    ];

    let allPassed = true;

    for (const file of jsFiles) {
        try {
            const response = await axios.get(BASE_URL + file);
            assert(response.status === 200, `${file} 文件正常加载`);
            assert(response.headers['content-type'].includes('javascript'), `${file} 返回JavaScript内容`);

            // 检查是否包含全局变量导出
            if (file.includes('components/') || file.includes('utils/')) {
                const componentName = file.split('/').pop().replace('.js', '');
                const globalVarName = componentName === 'api' || componentName === 'dom' || componentName === 'storage'
                    ? componentName
                    : componentName.charAt(0).toUpperCase() + componentName.slice(1);

                if (response.data.includes(`window.${globalVarName}`) ||
                    (componentName === 'dom' && response.data.includes('window.domUtils'))) {
                    assert(true, `${file} 正确导出全局变量`);
                } else {
                    warn(`${file} 可能未正确导出全局变量`);
                }
            }
        } catch (error) {
            assert(false, `${file} 文件加载失败: ${error.message}`);
            allPassed = false;
        }
    }

    return allPassed;
}

async function testAPIEndpoints() {
    console.log('\n🧪 测试API端点...');

    try {
        // 测试项目列表
        const projectsResponse = await axios.get(`${BASE_URL}/api/v1/projects`);
        assert(projectsResponse.status === 200, '项目列表API正常');
        assert(projectsResponse.data.success === true, '项目列表API返回成功状态');
        assert(Array.isArray(projectsResponse.data.data), '项目列表返回数组数据');

        // 测试项目创建
        const timestamp = Date.now();
        const newProject = {
            name: `前端测试项目${timestamp}`,
            type: 'git',
            source_path: 'https://github.com/octocat/Hello-World.git',
            branch: 'main',
            description: '前端自动化测试项目'
        };

        const createResponse = await axios.post(`${BASE_URL}/api/v1/projects`, newProject);
        assert(createResponse.status === 201, '项目创建API正常');
        assert(createResponse.data.success === true, '项目创建API返回成功状态');
        assert(createResponse.data.data.id, '返回项目ID');

        const projectId = createResponse.data.data.id;

        // 测试任务状态
        setTimeout(async () => {
            try {
                const taskResponse = await axios.get(`${BASE_URL}/api/v1/tasks/${projectId}`);
                assert(taskResponse.status === 200, '任务状态API正常');
                assert(taskResponse.data.success === true, '任务状态API返回成功状态');
                assert(taskResponse.data.data.status, '任务包含状态信息');
            } catch (error) {
                warn(`任务状态API测试失败: ${error.message}`);
            }
        }, 2000);

        return true;
    } catch (error) {
        assert(false, `API测试失败: ${error.message}`);
        return false;
    }
}

async function testImportFormValidation() {
    console.log('\n🧪 测试导入表单验证逻辑...');

    try {
        // 测试无效Git URL
        const invalidProject1 = {
            name: '测试项目',
            type: 'git',
            source_path: 'invalid-url',
            description: '测试'
        };

        try {
            await axios.post(`${BASE_URL}/api/v1/projects`, invalidProject1);
            assert(false, '应该拒绝无效的Git URL');
        } catch (error) {
            assert(error.response.status === 400, '正确拒绝无效Git URL');
        }

        // 测试空项目名称
        const invalidProject2 = {
            name: '',
            type: 'git',
            source_path: 'https://github.com/octocat/Hello-World.git',
            description: '测试'
        };

        try {
            await axios.post(`${BASE_URL}/api/v1/projects`, invalidProject2);
            assert(false, '应该拒绝空项目名称');
        } catch (error) {
            assert(error.response.status === 400, '正确拒绝空项目名称');
        }

        return true;
    } catch (error) {
        assert(false, `表单验证测试失败: ${error.message}`);
        return false;
    }
}

async function simulateUserInteraction() {
    console.log('\n🧪 模拟用户交互测试...');

    try {
        // 获取页面HTML
        const pageResponse = await axios.get(BASE_URL);
        const html = pageResponse.data;

        // 检查关键元素是否存在
        assert(html.includes('id="import-project-btn"'), '导入按钮存在');
        assert(html.includes('id="import-dialog"'), '导入对话框存在');
        assert(html.includes('id="confirm-import-btn"'), '确认导入按钮存在');
        assert(html.includes('id="cancel-import-btn"'), '取消按钮存在');
        assert(html.includes('id="git-url"'), 'Git URL输入框存在');
        assert(html.includes('id="project-name"'), '项目名称输入框存在');

        // 检查事件绑定相关代码
        const appJsResponse = await axios.get(`${BASE_URL}/js/app.js`);
        const appJs = appJsResponse.data;

        assert(appJs.includes('addEventListener(\'click\''), '应用包含事件监听器');
        assert(appJs.includes('import-project-btn'), '应用绑定导入按钮事件');
        assert(appJs.includes('components.importForm.show'), '应用调用导入表单显示方法');

        // 检查导入表单组件
        const importFormResponse = await axios.get(`${BASE_URL}/js/components/ImportForm.js`);
        const importFormJs = importFormResponse.data;

        assert(importFormJs.includes('handleSubmit'), '导入表单包含提交处理方法');
        assert(importFormJs.includes('validateForm'), '导入表单包含验证方法');
        assert(importFormJs.includes('window.ImportForm'), '导入表单正确导出为全局变量');

        return true;
    } catch (error) {
        assert(false, `用户交互测试失败: ${error.message}`);
        return false;
    }
}

// 生成测试报告
function generateTestReport() {
    console.log('\n📋 测试报告');
    console.log('='.repeat(50));

    console.log(`\n✅ 通过测试: ${testResults.passed.length}`);
    testResults.passed.forEach(result => console.log(`  ${result}`));

    if (testResults.failed.length > 0) {
        console.log(`\n❌ 失败测试: ${testResults.failed.length}`);
        testResults.failed.forEach(result => console.log(`  ${result}`));
    }

    if (testResults.warnings.length > 0) {
        console.log(`\n⚠️ 警告信息: ${testResults.warnings.length}`);
        testResults.warnings.forEach(result => console.log(`  ${result}`));
    }

    const totalTests = testResults.passed.length + testResults.failed.length;
    const successRate = totalTests > 0 ? (testResults.passed.length / totalTests * 100).toFixed(1) : 0;

    console.log(`\n📊 测试统计:`);
    console.log(`  总测试数: ${totalTests}`);
    console.log(`  成功率: ${successRate}%`);

    if (testResults.failed.length === 0) {
        console.log('\n🎉 所有测试通过！应用功能正常。');
    } else {
        console.log('\n⚠️ 发现问题，需要进一步调试和修复。');
    }

    return {
        total: totalTests,
        passed: testResults.passed.length,
        failed: testResults.failed.length,
        warnings: testResults.warnings.length,
        successRate: parseFloat(successRate)
    };
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始前端功能测试...\n');

    const tests = [
        testPageLoad,
        testJavaScriptFiles,
        testAPIEndpoints,
        testImportFormValidation,
        simulateUserInteraction
    ];

    for (const test of tests) {
        try {
            await test();
        } catch (error) {
            console.error(`测试执行错误: ${error.message}`);
            testResults.failed.push(`❌ 测试执行错误: ${error.message}`);
        }
    }

    return generateTestReport();
}

// 如果直接运行此脚本
if (require.main === module) {
    runTests().then(report => {
        process.exit(report.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('测试运行失败:', error);
        process.exit(1);
    });
}

module.exports = { runTests, testResults };
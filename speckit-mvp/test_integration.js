#!/usr/bin/env node

const http = require('http');

// 测试项目创建功能
function testCreateProject() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            name: '集成测试项目',
            description: '测试前后端集成功能',
            type: 'git',
            source_path: 'https://github.com/example/test-repo.git',
            branch: 'main'
        });

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/v1/projects',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ 项目创建API测试成功');
                        console.log(`📝 创建项目ID: ${jsonData.data.id}`);
                        resolve(jsonData);
                    } catch (error) {
                        console.log('❌ 项目创建响应格式错误');
                        reject(error);
                    }
                } else {
                    console.log(`❌ 项目创建API响应异常: ${res.statusCode}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ 项目创建API连接失败: ${err.message}`);
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

// 测试项目列表功能
function testGetProjects() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3001/api/v1/projects', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ 项目列表API测试成功');
                        console.log(`📊 获取到 ${jsonData.data.length} 个项目`);
                        resolve(jsonData);
                    } catch (error) {
                        console.log('❌ 项目列表响应格式错误');
                        reject(error);
                    }
                } else {
                    console.log(`❌ 项目列表API响应异常: ${res.statusCode}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ 项目列表API连接失败: ${err.message}`);
            reject(err);
        });

        req.setTimeout(5000, () => {
            console.log('❌ 项目列表API请求超时');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// 测试搜索功能
function testSearch() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3001/api/v1/search?q=test', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ 搜索API测试成功');
                        console.log(`🔍 搜索到 ${jsonData.data.length} 个结果`);
                        resolve(jsonData);
                    } catch (error) {
                        console.log('❌ 搜索响应格式错误');
                        reject(error);
                    }
                } else {
                    console.log(`❌ 搜索API响应异常: ${res.statusCode}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ 搜索API连接失败: ${err.message}`);
            reject(err);
        });

        req.setTimeout(5000, () => {
            console.log('❌ 搜索API请求超时');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// 测试前端页面功能
function testFrontendFunctionality() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    // 检查关键HTML元素
                    const hasHeader = data.includes('轻量级AI代码知识库');
                    const hasDashboard = data.includes('dashboard-page');
                    const hasProjects = data.includes('projects-page');
                    const hasSearch = data.includes('search-page');
                    const hasImportDialog = data.includes('import-dialog');
                    
                    if (hasHeader && hasDashboard && hasProjects && hasSearch && hasImportDialog) {
                        console.log('✅ 前端页面结构完整');
                        console.log('📄 包含所有必要的页面元素');
                        resolve(data);
                    } else {
                        console.log('❌ 前端页面结构不完整');
                        console.log(`Header: ${hasHeader}, Dashboard: ${hasDashboard}, Projects: ${hasProjects}, Search: ${hasSearch}, Import: ${hasImportDialog}`);
                        reject(new Error('前端页面结构不完整'));
                    }
                } else {
                    console.log(`❌ 前端页面响应异常: ${res.statusCode}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ 前端页面连接失败: ${err.message}`);
            reject(err);
        });

        req.setTimeout(5000, () => {
            console.log('❌ 前端页面请求超时');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// 主测试函数
async function runIntegrationTests() {
    console.log('🚀 开始前后端集成测试...\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    const tests = [
        { name: '前端页面功能', fn: testFrontendFunctionality },
        { name: '项目列表API', fn: testGetProjects },
        { name: '项目创建API', fn: testCreateProject },
        { name: '搜索API', fn: testSearch }
    ];
    
    for (const test of tests) {
        totalTests++;
        console.log(`${totalTests}. 测试${test.name}...`);
        
        try {
            await test.fn();
            passedTests++;
            console.log('');
        } catch (error) {
            console.log(`❌ ${test.name}测试失败: ${error.message}\n`);
        }
    }
    
    console.log('📊 测试结果统计:');
    console.log(`✅ 通过: ${passedTests}/${totalTests}`);
    console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 通过率: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 所有集成测试通过！');
        console.log('\n📝 系统状态:');
        console.log('- 前端服务: ✅ 正常运行 (http://localhost:3000)');
        console.log('- 后端服务: ✅ 正常运行 (http://localhost:3001)');
        console.log('- API接口: ✅ 功能正常');
        console.log('- 前后端通信: ✅ 连接正常');
        console.log('\n💡 使用建议:');
        console.log('1. 打开浏览器访问 http://localhost:3000');
        console.log('2. 如果页面有报错，请按F12打开开发者工具查看控制台');
        console.log('3. 可以尝试创建新项目或搜索功能');
    } else {
        console.log('\n⚠️ 部分测试失败，请检查相关服务');
        process.exit(1);
    }
}

// 运行集成测试
runIntegrationTests();

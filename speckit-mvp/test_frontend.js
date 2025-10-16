#!/usr/bin/env node

const http = require('http');
const https = require('https');

// 测试前端页面
function testFrontend() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ 前端页面加载成功');
                    resolve(data);
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

// 测试后端API
function testBackend() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3001/api/v1/projects', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ 后端API响应正常');
                        console.log(`📊 获取到 ${jsonData.data.length} 个项目`);
                        resolve(jsonData);
                    } catch (error) {
                        console.log('❌ 后端API响应格式错误');
                        reject(error);
                    }
                } else {
                    console.log(`❌ 后端API响应异常: ${res.statusCode}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ 后端API连接失败: ${err.message}`);
            reject(err);
        });
        
        req.setTimeout(5000, () => {
            console.log('❌ 后端API请求超时');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// 测试JavaScript文件
async function testJSFiles() {
    const jsFiles = [
        'js/utils/api.js',
        'js/utils/dom.js',
        'js/utils/storage.js',
        'js/components/ImportForm.js',
        'js/components/ProgressBar.js',
        'js/components/SearchBox.js',
        'js/components/ProjectCard.js',
        'js/components/SearchResult.js',
        'js/app.js'
    ];
    
    console.log('测试JavaScript文件加载...');
    
    for (const file of jsFiles) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:3000/${file}`, (res) => {
                    if (res.statusCode === 200) {
                        console.log(`✅ ${file} 加载成功`);
                        resolve();
                    } else {
                        console.log(`❌ ${file} 加载失败: ${res.statusCode}`);
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
                
                req.on('error', reject);
                req.setTimeout(3000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
            });
        } catch (error) {
            console.log(`❌ ${file} 加载错误: ${error.message}`);
        }
    }
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始测试 speckit-mvp 前端和后端...\n');
    
    try {
        // 测试前端页面
        console.log('1. 测试前端页面...');
        await testFrontend();
        console.log('');
        
        // 测试后端API
        console.log('2. 测试后端API...');
        await testBackend();
        console.log('');
        
        // 测试JavaScript文件
        console.log('3. 测试JavaScript文件...');
        await testJSFiles();
        console.log('');
        
        console.log('🎉 所有测试完成！');
        console.log('\n📝 测试总结:');
        console.log('- 前端页面: http://localhost:3000');
        console.log('- 后端API: http://localhost:3001/api/v1/projects');
        console.log('- 如果前端页面有报错，请检查浏览器控制台');
        
    } catch (error) {
        console.log(`\n❌ 测试失败: ${error.message}`);
        process.exit(1);
    }
}

// 运行测试
runTests();

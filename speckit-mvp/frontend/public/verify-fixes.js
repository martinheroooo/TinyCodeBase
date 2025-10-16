/**
 * 修复验证脚本
 * 在浏览器控制台中运行此脚本来验证所有修复
 */

async function verifyFixes() {
    console.log('🔧 开始验证修复效果...\n');

    const results = {
        apiPath: false,
        storageTool: false,
        infiniteRecursion: false,
        importForm: false,
        coreFunctions: false
    };

    // 1. 验证API路径修复
    console.log('1️⃣ 测试API路径修复...');
    try {
        const response = await window.api.get('/projects');
        if (response.success && Array.isArray(response.data)) {
            console.log('✅ API路径修复成功 - 获取到项目列表');
            results.apiPath = true;
        } else {
            console.log('❌ API响应格式不正确');
        }
    } catch (error) {
        console.log(`❌ API路径测试失败: ${error.message}`);
    }

    // 2. 验证存储工具修复
    console.log('\n2️⃣ 测试存储工具修复...');
    try {
        // 测试get/set方法是否存在
        if (typeof window.storage.get === 'function' && typeof window.storage.set === 'function') {
            // 测试实际存储功能
            window.storage.set('test_verification', { test: 'success', timestamp: Date.now() });
            const value = window.storage.get('test_verification');

            if (value && value.test === 'success') {
                console.log('✅ 存储工具修复成功 - get/set方法正常工作');
                results.storageTool = true;

                // 清理测试数据
                window.storage.remove('test_verification');
            } else {
                console.log('❌ 存储工具功能异常');
            }
        } else {
            console.log('❌ storage.get或storage.set方法不存在');
        }
    } catch (error) {
        console.log(`❌ 存储工具测试失败: ${error.message}`);
    }

    // 3. 验证无限递归修复
    console.log('\n3️⃣ 测试无限递归修复...');
    try {
        // 创建导入表单实例
        const importForm = new window.ImportForm({
            onSubmit: () => {},
            onCancel: () => {
                console.log('onCancel被调用');
            }
        });

        // 测试hide方法是否会导致无限递归
        let callCount = 0;
        const originalCancel = importForm.onCancel;
        importForm.onCancel = () => {
            callCount++;
            if (callCount > 10) {
                throw new Error('检测到无限递归');
            }
        };

        // 调用hide方法
        importForm.hide();

        // 恢复原始回调
        importForm.onCancel = originalCancel;

        if (callCount <= 1) {
            console.log('✅ 无限递归修复成功 - hide方法正常工作');
            results.infiniteRecursion = true;
        } else {
            console.log('❌ 仍存在递归调用问题');
        }
    } catch (error) {
        if (error.message === '检测到无限递归') {
            console.log('❌ 无限递归问题未修复');
        } else {
            console.log(`❌ 递归测试失败: ${error.message}`);
        }
    }

    // 4. 验证导入表单功能
    console.log('\n4️⃣ 测试导入表单功能...');
    try {
        // 检查ImportForm类是否存在
        if (window.ImportForm) {
            // 创建实例
            const importForm = new window.ImportForm({
                onSubmit: (data) => {
                    console.log('✅ 导入表单提交功能正常');
                },
                onCancel: () => {
                    console.log('✅ 导入表单取消功能正常');
                }
            });

            // 检查关键方法
            const methods = ['show', 'hide', 'validateForm', 'handleSubmit'];
            const missingMethods = methods.filter(method => typeof importForm[method] !== 'function');

            if (missingMethods.length === 0) {
                console.log('✅ 导入表单功能完整 - 所有必要方法存在');
                results.importForm = true;
            } else {
                console.log(`❌ 导入表单缺少方法: ${missingMethods.join(', ')}`);
            }
        } else {
            console.log('❌ ImportForm类不存在');
        }
    } catch (error) {
        console.log(`❌ 导入表单测试失败: ${error.message}`);
    }

    // 5. 验证核心功能
    console.log('\n5️⃣ 测试核心功能...');
    try {
        // 检查所有必需的全局变量
        const requiredGlobals = [
            'api', 'storage', 'domUtils',
            'ImportForm', 'ProgressBar', 'SearchBox',
            'ProjectCard', 'SearchResult'
        ];

        const missingGlobals = requiredGlobals.filter(name => !window[name]);

        if (missingGlobals.length === 0) {
            console.log('✅ 所有核心组件加载成功');
            results.coreFunctions = true;
        } else {
            console.log(`❌ 缺少核心组件: ${missingGlobals.join(', ')}`);
        }

        // 测试页面切换功能
        const app = window.app;
        if (app && typeof app.switchPage === 'function') {
            console.log('✅ 应用实例正常，页面切换功能可用');
        } else {
            console.log('❌ 应用实例异常');
        }
    } catch (error) {
        console.log(`❌ 核心功能测试失败: ${error.message}`);
    }

    // 输出总结
    console.log('\n📊 修复验证总结:');
    console.log('================');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;

    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ 通过' : '❌ 失败';
        const testName = {
            apiPath: 'API路径修复',
            storageTool: '存储工具修复',
            infiniteRecursion: '无限递归修复',
            importForm: '导入表单功能',
            coreFunctions: '核心功能'
        }[test];
        console.log(`${status} ${testName}`);
    });

    console.log(`\n总计: ${passedTests}/${totalTests} 项测试通过`);

    if (passedTests === totalTests) {
        console.log('🎉 所有修复验证成功！系统已恢复正常运行。');
        return true;
    } else {
        console.log('⚠️  部分修复验证失败，需要进一步检查。');
        return false;
    }
}

// 自动运行验证
if (typeof window !== 'undefined') {
    // 等待页面加载完成后运行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(verifyFixes, 2000); // 等待2秒确保所有脚本加载完成
        });
    } else {
        setTimeout(verifyFixes, 1000);
    }
}

// 导出为全局函数，方便手动调用
if (typeof window !== 'undefined') {
    window.verifyFixes = verifyFixes;
}
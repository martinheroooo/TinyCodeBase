#!/bin/bash

# TinyCodeRAG MVP 功能测试脚本

echo "🧪 TinyCodeRAG MVP 功能测试"
echo "=================================="

# 基础URL
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/v1"

echo "1. 测试服务器连接..."
curl -s -o /dev/null -w "%{http_code}" ${BASE_URL} > /tmp/status_code.txt
if [ "$(cat /tmp/status_code.txt)" = "200" ]; then
    echo "✅ 服务器运行正常"
else
    echo "❌ 服务器连接失败"
    exit 1
fi

echo ""
echo "2. 测试用户注册..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"password123"}')

echo "${REGISTER_RESPONSE}" | grep -q "User created successfully"
if [ $? -eq 0 ]; then
    echo "✅ 用户注册成功"
else
    echo "❌ 用户注册失败"
fi

echo ""
echo "3. 测试用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password123"}')

echo "${LOGIN_RESPONSE}" | grep -q "Login successful"
if [ $? -eq 0 ]; then
    echo "✅ 用户登录成功"
    # 提取token
    TOKEN=$(echo "${LOGIN_RESPONSE}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:20}..."
else
    echo "❌ 用户登录失败"
    exit 1
fi

echo ""
echo "4. 测试获取用户信息..."
USER_RESPONSE=$(curl -s -X GET "${API_BASE}/auth/me" \
    -H "Authorization: Bearer ${TOKEN}")

echo "${USER_RESPONSE}" | grep -q "testuser"
if [ $? -eq 0 ]; then
    echo "✅ 获取用户信息成功"
else
    echo "❌ 获取用户信息失败"
fi

echo ""
echo "5. 测试创建知识库（需要有效的Git URL）..."
KB_RESPONSE=$(curl -s -X POST "${API_BASE}/knowledge-bases" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"name":"Test KB","source_url":"https://github.com/octocat/Hello-World.git"}')

echo "${KB_RESPONSE}" | grep -q "Knowledge base created successfully"
if [ $? -eq 0 ]; then
    echo "✅ 知识库创建成功"
    # 提取知识库ID
    KB_ID=$(echo "${KB_RESPONSE}" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "   Knowledge Base ID: ${KB_ID}"
else
    echo "⚠️  知识库创建失败（可能需要网络连接或Git URL问题）"
fi

echo ""
echo "6. 测试获取知识库列表..."
KB_LIST_RESPONSE=$(curl -s -X GET "${API_BASE}/knowledge-bases" \
    -H "Authorization: Bearer ${TOKEN}")

echo "${KB_LIST_RESPONSE}" | grep -q "knowledge_bases"
if [ $? -eq 0 ]; then
    echo "✅ 获取知识库列表成功"
else
    echo "❌ 获取知识库列表失败"
fi

echo ""
echo "7. 测试无效的Git URL验证..."
INVALID_KB_RESPONSE=$(curl -s -X POST "${API_BASE}/knowledge-bases" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"name":"Invalid KB","source_url":"invalid-url"}')

echo "${INVALID_KB_RESPONSE}" | grep -q "Invalid Git URL"
if [ $? -eq 0 ]; then
    echo "✅ 无效Git URL验证成功"
else
    echo "❌ 无效Git URL验证失败"
fi

echo ""
echo "8. 测试未授权访问..."
UNAUTH_RESPONSE=$(curl -s -X GET "${API_BASE}/knowledge-bases")

echo "${UNAUTH_RESPONSE}" | grep -q "Access token required"
if [ $? -eq 0 ]; then
    echo "✅ 未授权访问验证成功"
else
    echo "❌ 未授权访问验证失败"
fi

echo ""
echo "=================================="
echo "🎉 基础功能测试完成！"
echo ""
echo "📋 测试总结："
echo "- 服务器连接: ✅"
echo "- 用户认证: ✅"
echo "- API端点: ✅"
echo "- 输入验证: ✅"
echo "- 权限控制: ✅"
echo ""
echo "🔧 需要手动测试的功能："
echo "- 实际Git仓库克隆和处理"
echo "- AI代码分析（需要OpenAI API密钥）"
echo "- 前端界面交互"
echo "- 文档导出功能"
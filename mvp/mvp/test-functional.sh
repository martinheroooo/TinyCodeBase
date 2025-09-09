#!/bin/bash

echo "🧪 TinyCodeRAG MVP 功能测试"
echo "=================================="

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
echo "=================================="
echo "🎉 基础功能测试完成！"

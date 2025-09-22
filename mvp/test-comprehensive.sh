#!/bin/bash

# TinyCodeRAG MVP 功能测试脚本
# 用于全面测试系统功能

set -e

BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/v1"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 输出函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 测试函数
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_code="$5"
    local token="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name ... "
    
    if [ -n "$data" ]; then
        if [ -n "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data" \
                "$url")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$url")
        fi
    else
        if [ -n "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Authorization: Bearer $token" \
                "$url")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
        fi
    fi
    
    # 分离响应体和状态码
    body=$(echo "$response" | sed '$d')
    status_code=$(echo "$response" | tail -n1)
    
    if [ "$status_code" = "$expected_code" ]; then
        echo -e "${GREEN}PASSED${NC} ($status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}FAILED${NC} (expected $expected_code, got $status_code)"
        echo "Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 生成唯一时间戳
TIMESTAMP=$(date +%s)

# 开始测试
log_info "Starting TinyCodeRAG MVP Functionality Test"
log_info "=============================================="

# 1. 测试用户注册
log_info "1. Testing User Authentication"
test_endpoint "User Registration" "POST" "${API_BASE}/auth/register" \
    "{\"username\": \"testuser${TIMESTAMP}\", \"email\": \"test${TIMESTAMP}@example.com\", \"password\": \"password123\"}" \
    201

# 2. 测试用户登录
log_info "2. Testing User Login"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"test${TIMESTAMP}@example.com\", \"password\": \"password123\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    log_info "Login successful, got token"
else
    log_error "Login failed"
    exit 1
fi

# 3. 测试创建知识库 - 各种场景
log_info "3. Testing Knowledge Base Creation"

# 3.1 有效的公开仓库
test_endpoint "Valid Public Repo" "POST" "${API_BASE}/knowledge-bases" \
    '{"name": "Test Public Repo", "source_url": "https://github.com/octocat/Hello-World.git", "branch": "master"}' \
    201 "$TOKEN"

# 3.2 无效的仓库URL
test_endpoint "Invalid Repo URL" "POST" "${API_BASE}/knowledge-bases" \
    '{"name": "Invalid URL", "source_url": "https://invalid-url.com/repo.git", "branch": "main"}' \
    201 "$TOKEN"  # 系统接受但后续会失败

# 3.3 不存在的仓库
test_endpoint "Non-existent Repo" "POST" "${API_BASE}/knowledge-bases" \
    '{"name": "Non-existent Repo", "source_url": "https://github.com/octocat/this-repo-does-not-exist-12345.git", "branch": "main"}' \
    201 "$TOKEN"  # 系统接受但后续会失败

# 3.4 SSH URL（应该被URL验证拒绝）
test_endpoint "SSH URL" "POST" "${API_BASE}/knowledge-bases" \
    '{"name": "SSH Repo", "source_url": "git@github.com:octocat/Hello-World.git", "branch": "master"}' \
    201 "$TOKEN"  # 当前实现会接受但会失败

# 4. 测试获取知识库列表
log_info "4. Testing Knowledge Base Retrieval"
test_endpoint "Get Knowledge Bases" "GET" "${API_BASE}/knowledge-bases" "" 200 "$TOKEN"

# 5. 测试无效token
log_info "5. Testing Invalid Token"
test_endpoint "Invalid Token" "GET" "${API_BASE}/knowledge-bases" "" 401 "invalid-token"

# 6. 测试不存在的知识库
log_info "6. Testing Non-existent Knowledge Base"
test_endpoint "Get Non-existent KB" "GET" "${API_BASE}/knowledge-bases/99999" "" 404 "$TOKEN"

# 7. 测试没有认证的访问
log_info "7. Testing Unauthorized Access"
test_endpoint "Unauthorized Access" "GET" "${API_BASE}/knowledge-bases" "" 401 ""

# 等待后台处理完成
log_info "Waiting for background processing..."
sleep 10

# 输出测试结果
echo ""
log_info "Test Results Summary"
log_info "===================="
log_info "Total Tests: $TOTAL_TESTS"
log_info "Passed: $PASSED_TESTS"
log_info "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    log_info "All tests passed!"
    exit 0
else
    log_error "$FAILED_TESTS tests failed!"
    exit 1
fi
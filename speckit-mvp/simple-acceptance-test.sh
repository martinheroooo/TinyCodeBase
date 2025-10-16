#!/bin/bash

# 轻量级AI代码知识库产品验收测试脚本

echo "🚀 开始产品验收测试..."
echo "=================================="

BASE_URL="http://localhost:3001"
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_result() {
    local test_name="$1"
    local result="$2"
    local expected="$3"

    if [ "$result" = "$expected" ]; then
        echo "✅ $test_name: 通过"
        ((PASSED_TESTS++))
        return 0
    else
        echo "❌ $test_name: 失败"
        echo "   期望: $expected"
        echo "   实际: $result"
        ((FAILED_TESTS++))
        return 1
    fi
}

# 1. 测试服务器响应
echo ""
echo "📋 测试1: 服务器响应检查"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
test_result "服务器HTTP状态码" "$HTTP_STATUS" "200"

# 2. 测试页面加载
echo ""
echo "📋 测试2: 页面内容检查"

PAGE_TITLE=$(curl -s "$BASE_URL" | grep -o '<title>[^<]*' | sed 's/<title>//' | head -1)
test_result "页面标题" "$PAGE_TITLE" "轻量级AI代码知识库"

# 检查关键元素存在
CHECK_ELEMENTS=(
    "开始导入"
    "仪表板"
    "项目管理"
    "搜索"
    "导入代码项目"
    "轻量级AI代码知识库"
)

for element in "${CHECK_ELEMENTS[@]}"; do
    ELEMENT_EXISTS=$(curl -s "$BASE_URL" | grep -c "$element")
    test_result "页面元素存在: $element" "$ELEMENT_EXISTS" "1"
done

# 3. 测试静态文件加载
echo ""
echo "📋 测试3: 静态文件加载检查"

STATIC_FILES=(
    "/css/style.css"
    "/css/components.css"
    "/js/utils/api.js"
    "/js/utils/dom.js"
    "/js/utils/storage.js"
    "/js/components/ImportForm.js"
    "/js/components/ProgressBar.js"
    "/js/components/SearchBox.js"
    "/js/components/ProjectCard.js"
    "/js/components/SearchResult.js"
    "/js/app.js"
)

for file in "${STATIC_FILES[@]}"; do
    FILE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$file")
    test_result "静态文件加载: $file" "$FILE_STATUS" "200"
done

# 4. 测试API端点
echo ""
echo "📋 测试4: API端点测试"

# 测试项目列表API
PROJECTS_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/projects")
test_result "项目列表API" "$PROJECTS_API_STATUS" "200"

# 测试项目列表返回格式
PROJECTS_RESPONSE=$(curl -s "$BASE_URL/api/v1/projects")
PROJECTS_SUCCESS=$(echo "$PROJECTS_RESPONSE" | jq -r '.success' 2>/dev/null)
test_result "项目API返回格式" "$PROJECTS_SUCCESS" "true"

# 5. 测试创建项目API（模拟）
echo ""
echo "📋 测试5: 项目创建API测试"

CREATE_PROJECT_DATA='{
    "name": "验收测试项目",
    "description": "产品验收测试项目",
    "type": "git",
    "git_url": "https://github.com/octocat/Hello-World.git",
    "git_branch": "main"
}'

CREATE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$CREATE_PROJECT_DATA" \
    "$BASE_URL/api/v1/projects")

CREATE_SUCCESS=$(echo "$CREATE_RESPONSE" | jq -r '.success' 2>/dev/null)
if [ "$CREATE_SUCCESS" = "true" ]; then
    test_result "项目创建API" "$CREATE_SUCCESS" "true"
    PROJECT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id' 2>/dev/null)
    echo "   创建的项目ID: $PROJECT_ID"
else
    test_result "项目创建API" "false" "true"
    echo "   响应: $CREATE_RESPONSE"
fi

# 6. 测试搜索API
echo ""
echo "📋 测试6: 搜索API测试"

SEARCH_QUERY="test"
SEARCH_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/search?q=$SEARCH_QUERY")
test_result "搜索API状态码" "$SEARCH_API_STATUS" "200"

SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/v1/search?q=$SEARCH_QUERY")
SEARCH_SUCCESS=$(echo "$SEARCH_RESPONSE" | jq -r '.success' 2>/dev/null)
test_result "搜索API返回格式" "$SEARCH_SUCCESS" "true"

# 7. 检查JavaScript语法
echo ""
echo "📋 测试7: JavaScript语法检查"

JS_FILES=(
    "frontend/public/js/app.js"
    "frontend/public/js/utils/api.js"
    "frontend/public/js/utils/dom.js"
    "frontend/public/js/utils/storage.js"
    "frontend/public/js/components/ImportForm.js"
    "frontend/public/js/components/ProgressBar.js"
    "frontend/public/js/components/SearchBox.js"
    "frontend/public/js/components/ProjectCard.js"
    "frontend/public/js/components/SearchResult.js"
)

for js_file in "${JS_FILES[@]}"; do
    if [ -f "$js_file" ]; then
        if node -c "$js_file" 2>/dev/null; then
            test_result "JS语法检查: $(basename $js_file)" "0" "0"
        else
            test_result "JS语法检查: $(basename $js_file)" "1" "0"
        fi
    else
        test_result "JS文件存在: $(basename $js_file)" "false" "true"
    fi
done

# 8. 测试错误处理
echo ""
echo "📋 测试8: 错误处理测试"

# 测试不存在的API端点
NOT_FOUND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/nonexistent")
test_result "404错误处理" "$NOT_FOUND_STATUS" "404"

# 测试无效的JSON请求
INVALID_JSON_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "invalid json" \
    "$BASE_URL/api/v1/projects")
INVALID_JSON_STATUS=$(echo "$INVALID_JSON_RESPONSE" | jq -r '.success' 2>/dev/null)
test_result "无效JSON处理" "$INVALID_JSON_STATUS" "false"

# 生成测试报告
echo ""
echo "📊 产品验收测试报告"
echo "=================================="

TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))
PASS_RATE=0

if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")
fi

echo "总测试数: $TOTAL_TESTS"
echo "通过测试: $PASSED_TESTS"
echo "失败测试: $FAILED_TESTS"
echo "通过率: ${PASS_RATE}%"

echo ""
echo "🎯 产品验收结论:"
if (( $(echo "$PASS_RATE >= 90" | bc -l 2>/dev/null || echo 0) )); then
    echo "✅ 产品验收通过 - 核心功能运行正常，可以发布"
    EXIT_CODE=0
elif (( $(echo "$PASS_RATE >= 70" | bc -l 2>/dev/null || echo 0) )); then
    echo "⚠️  产品部分通过 - 存在一些问题需要修复，建议完善后发布"
    EXIT_CODE=1
else
    echo "❌ 产品验收未通过 - 存在严重问题，需要修复后重新测试"
    EXIT_CODE=2
fi

# 保存测试报告
REPORT_FILE="acceptance-test-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
    "testTime": "$(date -Iseconds)",
    "summary": {
        "total": $TOTAL_TESTS,
        "passed": $PASSED_TESTS,
        "failed": $FAILED_TESTS,
        "passRate": $PASS_RATE
    },
    "baseUrl": "$BASE_URL",
    "status": "$([ $EXIT_CODE -eq 0 ] && echo "PASSED" || echo "FAILED")"
}
EOF

echo ""
echo "📁 测试报告已保存到: $REPORT_FILE"

exit $EXIT_CODE
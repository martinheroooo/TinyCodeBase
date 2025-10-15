# 快速开始指南

## 概述

轻量级AI代码知识库是一个帮助开发者快速理解代码项目的工具。支持从Git仓库或本地文件夹导入代码，自动生成结构化文档。

## 系统要求

- Node.js 18+ LTS
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)
- 2GB+ 可用内存
- 网络连接 (用于Git克隆和大模型API调用)

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd TinyCodeBase/speckit-mvp
```

### 2. 安装后端依赖

```bash
cd backend
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下参数：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_PATH=./data/speckit.db

# 大模型API配置
API_ENDPOINT=https://api.openai.com/v1
API_KEY=your_api_key_here
MODEL_NAME=gpt-3.5-turbo

# 其他配置
MAX_PROJECT_SIZE_MB=100
TEMP_DIR=./temp
EXPORT_DIR=./exports
```

### 4. 初始化数据库

```bash
npm run db:migrate
```

### 5. 启动后端服务

```bash
npm run dev
```

服务将在 `http://localhost:3000` 启动。

### 6. 打开前端界面

在浏览器中打开 `frontend/public/index.html`

## 基本使用

### 导入项目

1. 点击"导入代码"按钮
2. 选择导入方式：
   - **Git仓库**: 输入GitHub/GitLab等公共仓库URL
   - **本地文件夹**: 选择本地代码目录
3. 点击"开始导入"

### 查看生成文档

1. 导入完成后，系统会自动开始分析代码
2. 实时查看处理进度
3. 分析完成后可以浏览：
   - 项目概览和统计信息
   - 目录结构树
   - 函数和类说明文档
   - 代码搜索功能

### 导出文档

1. 在项目详情页面点击"导出文档"
2. 选择导出格式（Markdown、PDF或HTML）
3. 点击"开始导出"
4. 导出完成后下载文件

## 主要功能

### 🚀 快速导入
- 支持Git仓库URL导入
- 支持本地文件夹导入
- 实时处理进度显示
- 错误处理和重试机制

### 📊 智能分析
- 自动识别编程语言
- 生成项目统计信息
- 提取函数和类结构
- AI生成功能描述

### 🔍 强大搜索
- 全文搜索功能
- 按文件类型过滤
- 搜索结果高亮显示
- 快速跳转到源代码

### 📁 项目管理
- 多项目并行管理
- 项目重新生成功能
- 文档导出和分享
- 项目统计和历史记录

## 支持的编程语言

- **JavaScript** (ES6+)
- **Python** (3.6+)
- **Java** (8+)
- **TypeScript**
- **Go**
- **C/C++**
- **HTML/CSS**
- **JSON/YAML**
- 更多语言持续添加中...

## 性能说明

### 处理能力
- 最大支持项目大小：100MB
- 最大文件数量：10,000个
- 最大代码行数：100万行
- 典型处理时间：2-4分钟

### 搜索性能
- 全文搜索响应时间：<2秒
- 支持复杂搜索查询
- 搜索结果分页显示

## 故障排除

### 常见问题

**Q: 导入失败，提示"网络错误"**
A: 检查网络连接，确认Git仓库URL是否正确，或尝试使用本地文件夹导入

**Q: 文档生成不完整**
A: 确认API密钥配置正确，检查大模型API服务是否可用，或尝试重新生成文档

**Q: 搜索结果不准确**
A: 尝试使用不同的搜索关键词，或者检查相关文档是否已生成

**Q: 界面加载缓慢**
A: 检查项目文件大小，大项目可能需要更长的加载时间

### 错误代码

- **E001**: Git克隆失败
- **E002**: 文件解析错误
- **E003**: API调用失败
- **E004**: 数据库连接错误
- **E005**: 文件系统权限错误

### 日志查看

后端日志位置：
```bash
tail -f backend/logs/app.log
```

浏览器控制台：
```javascript
// 在浏览器开发者工具中查看
console.log('Debug info:', window.app.debug);
```

## 开发模式

### 启动开发服务器

```bash
# 后端开发服务器
cd backend
npm run dev

# 前端开发服务器（如果使用构建工具）
cd frontend
npm run serve
```

### 调试模式

```bash
# 启用详细日志
DEBUG=speckit:* npm run dev

# 启用性能监控
ENABLE_PERFORMANCE_MONITORING=true npm run dev
```

### 测试

```bash
# 运行后端测试
npm test

# 运行集成测试
npm run test:integration

# 生成测试覆盖率报告
npm run test:coverage
```

## 配置说明

### 环境变量详解

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| PORT | 服务器端口 | 3000 | 8080 |
| DB_PATH | 数据库文件路径 | ./data/speckit.db | /var/lib/speckit/speckit.db |
| API_ENDPOINT | 大模型API端点 | https://api.openai.com/v1 | https://api.anthropic.com |
| API_KEY | API密钥 | 无 | sk-xxxxxx |
| MODEL_NAME | 模型名称 | gpt-3.5-turbo | claude-3-haiku |
| MAX_PROJECT_SIZE_MB | 最大项目大小(MB) | 100 | 500 |
| TEMP_DIR | 临时目录 | ./temp | /tmp/speckit |
| EXPORT_DIR | 导出目录 | ./exports | /var/www/exports |

### 自定义配置

可以通过修改 `backend/config/default.js` 文件来自定义更多配置选项：

```javascript
module.exports = {
  // 代码解析配置
  parser: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    excludedPatterns: ['*.min.js', '*.map'],
    supportedLanguages: ['javascript', 'python', 'java'],
  },

  // AI配置
  ai: {
    maxTokens: 4096,
    temperature: 0.3,
    requestTimeout: 30000,
    retryAttempts: 3,
  },

  // 缓存配置
  cache: {
    enabled: true,
    ttl: 3600, // 1小时
    maxSize: 100 * 1024 * 1024, // 100MB
  }
};
```

## 贡献指南

欢迎贡献代码和改进建议！请参考项目的贡献指南。

### 开发流程

1. Fork 项目
2. 创建功能分支
3. 编写代码和测试
4. 提交Pull Request
5. 代码审查和合并

### 代码规范

- 使用ESLint进行代码检查
- 遵循项目命名约定
- 编写单元测试
- 更新相关文档

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 获取帮助

如果遇到问题或需要帮助：

1. 查看文档和FAQ
2. 搜索已有的Issues
3. 创建新的Issue
4. 联系开发团队

---

**注意**: 这是一个轻量级工具，专注于核心功能。如果需要更高级的功能（如多用户支持、权限管理等），请考虑使用企业版或自行扩展。
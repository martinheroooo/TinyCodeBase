# TinyCodeRAG MVP版本三天开发计划

基于PRD和TRD文档，本计划专注于核心功能实现，确保三天内完成可用的MVP版本。

## 📋 总体目标

创建一个轻量级AI代码知识库工具，支持Git仓库导入、自动代码分析和文档生成的核心功能。

## 🗓️ 第一天：项目基础搭建和核心架构

### 🔧 环境和框架搭建
- [x] **初始化Node.js项目**
  - 创建package.json，配置基础依赖：express, sequelize, sqlite3, simple-git, openai, bcryptjs, jsonwebtoken
  - 设置项目目录结构：controllers/, models/, routes/, middleware/, public/
  
- [x] **搭建Express服务器框架**
  - 创建app.js主文件，配置基础中间件（cors, body-parser, 静态文件服务）
  - 设置路由结构：/api/v1/auth, /api/v1/knowledge-bases
  - 配置错误处理中间件

### 🗄️ 数据库设计和实现
- [x] **创建SQLite数据库表结构**
  - Users表：id, username, email, password_hash, created_at
  - KnowledgeBases表：id, user_id, name, source_url, branch, status, progress, created_at
  - DirectoryStructures表：id, knowledge_base_id, parent_id, name, type, path
  - FileAnalyses表：id, directory_structure_id, analysis, language, status

### 🔐 用户认证系统
- [x] **实现用户认证API**
  - POST /api/v1/auth/register - 用户注册（用户名、邮箱、密码）
  - POST /api/v1/auth/login - 用户登录，返回JWT token
  - GET /api/v1/auth/me - 获取当前用户信息
  - 创建JWT验证中间件

### 🎨 基础前端页面
- [x] **创建前端页面结构**
  - 登录/注册页面（public/auth.html）
  - 知识库列表页面（public/dashboard.html）
  - 引入Tailwind CSS和基础JavaScript

---

## 🗓️ 第二天：Git仓库处理和AI分析核心功能

### 📦 Git仓库处理
- [x] **实现Git仓库克隆功能**
  - 创建GitService类，使用simple-git库
  - 支持Git URL验证（github.com, gitlab.com等）
  - 实现仓库克隆到临时目录功能
  - 添加分支切换支持

### 📁 目录结构扫描
- [x] **开发目录扫描功能**
  - 创建DirectoryScanner类
  - 递归扫描项目目录，过滤掉node_modules、.git等无关目录
  - 生成文件树结构并存储到DirectoryStructures表
  - 识别主要代码文件类型（.js, .py, .java, .go等）

### 🤖 AI代码分析集成
- [x] **集成OpenAI API**
  - 配置OpenAI API客户端
  - 设计代码分析提示词："简要说明这个文件的功能，列出核心函数及其作用（不超过200字）"
  - 实现批量文件分析，限制前20个核心文件
  - 将分析结果存储到FileAnalyses表

### 🔄 异步处理和进度跟踪
- [x] **实现知识库创建API**
  - POST /api/v1/knowledge-bases - 创建知识库（Git URL + 名称）
  - 实现异步处理流程：克隆→扫描→分析→完成
  - GET /api/v1/knowledge-bases/:id/status - 获取处理进度
  - 更新数据库status和progress字段

### 📊 知识库管理界面
- [x] **开发知识库列表页面**
  - 显示用户的知识库列表（名称、状态、创建时间）
  - 实时显示处理进度条
  - 支持删除知识库功能

---

## 🗓️ 第三天：前端展示和文档导出功能

### 🌳 知识库详情展示
- [x] **实现知识库详情页面**
  - 创建knowledge-base.html页面
  - 左侧：可折叠的目录树组件（使用原生JavaScript）
  - 右侧：文件内容和AI分析结果展示区域
  - GET /api/v1/knowledge-bases/:id/directory-structure - 获取目录结构API

### 🖱️ 交互功能开发
- [x] **开发目录树交互功能**
  - 实现目录节点展开/折叠功能
  - 文件点击显示AI分析结果
  - GET /api/v1/knowledge-bases/:id/files/:fileId - 获取文件分析API
  - 使用marked.js渲染Markdown格式的分析结果

### 📄 文档导出功能
- [x] **实现Markdown文档导出**
  - GET /api/v1/knowledge-bases/:id/export - 文档导出API
  - 生成包含完整目录结构和AI分析的Markdown文件
  - 前端实现下载功能，文件命名：{知识库名称}_documentation.md

### 🎯 用户体验优化
- [x] **完善错误处理和用户体验**
  - 添加加载状态指示器（处理中、分析中等）
  - 实现错误提示机制（Git URL无效、API调用失败等）
  - 添加确认对话框（删除知识库时）
  - 优化移动端响应式布局

### 🧪 系统测试和验证
- [ ] **系统功能测试**
  - 测试完整流程：注册→登录→创建知识库→查看结果→导出文档
  - 验证Git仓库克隆功能（测试公开GitHub仓库）
  - 测试AI分析功能和结果展示
  - 修复发现的关键bug

---

## 🚀 MVP功能范围说明

### ✅ 包含的核心功能
- 用户注册/登录系统
- Git仓库导入（支持公开仓库）
- 自动目录结构扫描
- AI代码分析（限制20个文件）
- 可视化目录树展示
- Markdown文档导出
- 基础的进度跟踪

### ❌ 暂不包含的功能
- 本地文件上传
- 复杂权限管理
- 增量更新
- 高级过滤规则
- Mermaid图表生成
- 多格式导出
- 批量操作

## 🔧 技术栈确认

**后端**: Node.js + Express + SQLite + Sequelize
**前端**: HTML + Vanilla JavaScript + Tailwind CSS
**AI集成**: OpenAI API
**版本控制**: simple-git

## 📝 关键注意事项

1. **简化优先**：专注核心功能，避免过度设计
2. **错误处理**：确保Git克隆失败、API调用失败等场景有合适提示
3. **性能考虑**：限制AI分析文件数量，避免超时
4. **用户体验**：提供清晰的进度反馈和状态提示
5. **测试验证**：每天结束前验证当天功能是否正常工作

## 🎯 成功标准

MVP完成后，用户应该能够：
1. 注册账号并登录系统
2. 输入GitHub仓库URL创建知识库
3. 查看自动生成的项目目录结构
4. 阅读AI生成的代码文件分析
5. 导出完整的项目文档

此计划确保在三天内交付一个功能完整、可用的MVP版本。

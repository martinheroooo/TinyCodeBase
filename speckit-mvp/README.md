# 轻量级AI代码知识库

一个帮助开发者快速理解代码项目的AI驱动工具，支持从Git仓库或本地文件夹导入代码，自动生成结构化文档。

## 功能特性

- 🚀 **快速导入** - 支持Git仓库URL和本地文件夹导入
- 📊 **智能分析** - 自动识别编程语言，生成项目统计信息
- 🤖 **AI文档生成** - 使用大模型API生成代码描述和文档
- 🔍 **强大搜索** - 全文搜索功能，支持代码和文档搜索
- 📁 **项目管理** - 多项目并行管理，支持重新生成和导出
- 💻 **轻量级** - 本地部署，无需复杂的云服务配置

## 技术栈

### 后端
- **运行时**: Node.js 18+ LTS
- **框架**: Express.js
- **数据库**: SQLite3
- **代码解析**: Tree-sitter
- **AI集成**: OpenAI兼容API

### 前端
- **基础**: HTML5 + CSS3 + JavaScript ES6+
- **架构**: 模块化组件设计
- **样式**: 原生CSS（无框架依赖）

## 快速开始

### 系统要求

- Node.js 18+ LTS
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）
- 2GB+ 可用内存

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd TinyCodeBase/speckit-mvp
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置API密钥等参数
   ```

4. **初始化数据库**
   ```bash
   npm run db:migrate
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

6. **打开前端界面**

   在浏览器中访问 http://localhost:3000

## 项目结构

```
speckit-mvp/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── api/            # API路由
│   │   ├── controllers/    # 控制器（待实现）
│   │   ├── services/       # 业务逻辑（待实现）
│   │   ├── models/         # 数据模型（待实现）
│   │   └── utils/          # 工具函数
│   ├── tests/              # 测试文件
│   └── server.js           # 服务器入口
├── frontend/               # 前端文件
│   └── public/
│       ├── index.html      # 主页面
│       ├── css/            # 样式文件
│       └── js/             # JavaScript文件
└── docs/                   # 项目文档
```

## 开发指南

### 可用脚本

```bash
# 开发模式启动
npm run dev

# 生产模式启动
npm start

# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format

# 数据库迁移
npm run db:migrate

# 数据库重置
npm run db:reset
```

### 环境变量配置

主要配置项：

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

## 开发进度

### 阶段1: 项目初始化 ✅
- [x] 项目目录结构创建
- [x] Node.js项目初始化
- [x] 代码检查和格式化工具配置
- [x] 环境配置文件创建
- [x] 前端基础文件结构
- [x] 数据库配置和初始化脚本
- [x] 开发服务器配置

### 阶段2: 基础设施 🚧
- [x] Express.js API路由结构
- [x] 数据库表设计和创建
- [ ] 错误处理和日志记录
- [ ] 文件上传和临时文件管理
- [ ] 基础模型和服务层
- [ ] 大模型API客户端
- [ ] 代码解析器框架
- [ ] 搜索索引基础设施
- [ ] 异步任务队列

### 阶段3: 用户故事1 - 快速导入代码仓库 📋
- [ ] 项目控制器实现
- [ ] Git仓库克隆服务
- [ ] 本地文件夹扫描服务
- [ ] 文件分析和元数据提取
- [ ] 项目管理数据模型
- [ ] 文件管理数据模型
- [ ] 任务状态管理模型
- [ ] 项目相关API端点
- [ ] 前端导入表单组件
- [ ] 前端进度显示组件
- [ ] 项目导入功能集成
- [ ] 错误处理和用户友好信息
- [ ] 实时进度更新机制

### 后续阶段

- **用户故事2**: 智能文档生成
- **用户故事3**: 可视化文档浏览
- **用户故事4**: 项目管理

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 Issue
- 发送邮件
- 参与讨论

---

**注意**: 这是一个轻量级工具，专注于核心功能。如果需要更高级的功能（如多用户支持、权限管理等），请考虑使用企业版或自行扩展。
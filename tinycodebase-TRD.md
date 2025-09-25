# TinyCodeBase SaaS平台 技术需求文档(TRD)

## 1. 技术栈选择

### 1.1 服务端技术栈
- **核心框架**: Node.js + Express.js
  - 选择理由: 轻量级、高性能，适合构建API服务；JavaScript全栈开发减少技术切换成本；丰富的中间件生态加速开发
- **AI集成**: OpenAI API客户端 (openai npm包)
  - 选择理由: 简化AI模型调用流程，支持流式响应，适合代码解析场景
- **Git操作**: simple-git
  - 选择理由: 轻量级Node.js Git操作库，支持仓库克隆、分支切换等核心功能
- **文件处理**: multer + fs-extra
  - 选择理由: multer专注处理文件上传，fs-extra扩展原生fs模块，提供更便捷的文件操作API
- **数据库ORM**: Sequelize
  - 选择理由: 支持多种数据库，提供强大的模型定义和查询能力，简化数据操作
- **日志处理**: winston
  - 选择理由: 灵活的日志管理工具，支持多传输方式，便于调试和问题追踪

### 1.2 前端技术栈
- **基础技术**: HTML5 + Vanilla JavaScript + CSS3
  - 选择理由: 符合需求，减少学习成本，避免过度工程化
- **样式框架**: Tailwind CSS
  - 选择理由: 原子化CSS框架，开发效率高，无需编写大量自定义CSS
- **Markdown渲染**: marked.js + highlight.js
  - 选择理由: 轻量高效，支持代码高亮，满足文档展示需求
- **UI组件**: 原生实现 + Font Awesome
  - 选择理由: 减少外部依赖，保持轻量，Font Awesome提供丰富图标

### 1.3 数据存储
- **主数据库**: SQLite (开发环境) / PostgreSQL (生产环境)
  - 选择理由: SQLite适合快速开发和轻量部署，PostgreSQL提供更好的并发性能和扩展性
- **文件存储**: 本地文件系统 (初期)
  - 选择理由: 简化开发，后期可平滑迁移到对象存储服务

### 1.4 开发与部署工具
- **容器化**: Docker + Docker Compose
  - 选择理由: 确保开发环境一致性，简化部署流程
- **API文档**: Swagger/OpenAPI
  - 选择理由: 自动生成API文档，便于前后端协作
- **代码质量**: ESLint + Prettier
  - 选择理由: 保证代码风格一致性，减少潜在错误

## 2. 系统架构设计

### 2.1 整体架构
采用分层架构设计，清晰分离关注点：

```
客户端层 → API网关层 → 应用服务层 → 数据访问层 → 存储层
```

### 2.2 核心组件
1. **客户端层**
   - 静态Web页面
   - 前端交互逻辑
   - API请求处理

2. **API网关层**
   - 请求路由
   - 认证授权
   - 请求限流
   - 日志记录

3. **应用服务层**
   - 用户服务: 处理用户注册、登录等
   - 知识库服务: 管理知识库生命周期
   - Git处理服务: 仓库克隆与解析
   - 文件处理服务: 本地文件上传与解析
   - AI处理服务: 代码分析与文档生成
   - 文档服务: 文档展示与导出

4. **数据访问层**
   - 数据库模型定义
   - 数据查询与操作
   - 事务管理

5. **存储层**
   - 关系型数据库
   - 文件系统
   - 缓存(可选)

### 2.3 核心流程设计
1. **知识库创建流程**
   ```
   客户端 → API网关 → 知识库服务 → Git/文件处理服务 → AI处理服务 → 数据存储
   ```

2. **代码查询流程**
   ```
   客户端 → API网关 → 知识库服务 → 数据访问层 → 客户端
   ```

## 3. 数据库设计

### 3.1 Users表 (用户表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 用户ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| email | VARCHAR(100) | UNIQUE, NOT NULL | 邮箱 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| last_login | DATETIME | NULL | 最后登录时间 |
| status | ENUM('active', 'inactive') | DEFAULT 'active' | 账号状态 |

### 3.2 KnowledgeBases表 (知识库表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 知识库ID |
| user_id | INTEGER | FOREIGN KEY (Users.id), NOT NULL | 所属用户ID |
| name | VARCHAR(100) | NOT NULL | 知识库名称 |
| description | TEXT | NULL | 知识库描述 |
| source_type | ENUM('git', 'local') | NOT NULL | 来源类型 |
| source_url | VARCHAR(255) | NULL | Git仓库URL |
| branch | VARCHAR(50) | DEFAULT 'main' | Git分支 |
| local_path | VARCHAR(255) | NULL | 本地存储路径 |
| status | ENUM('pending', 'processing', 'completed', 'failed') | DEFAULT 'pending' | 处理状态 |
| progress | INTEGER | DEFAULT 0 | 处理进度(0-100) |
| total_files | INTEGER | DEFAULT 0 | 总文件数 |
| processed_files | INTEGER | DEFAULT 0 | 已处理文件数 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |
| completed_at | DATETIME | NULL | 完成时间 |

### 3.3 DirectoryStructures表 (目录结构表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 目录节点ID |
| knowledge_base_id | INTEGER | FOREIGN KEY (KnowledgeBases.id), NOT NULL | 所属知识库ID |
| parent_id | INTEGER | FOREIGN KEY (DirectoryStructures.id), NULL | 父节点ID |
| name | VARCHAR(100) | NOT NULL | 节点名称 |
| type | ENUM('directory', 'file') | NOT NULL | 节点类型 |
| path | VARCHAR(512) | NOT NULL | 路径 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### 3.4 FileAnalyses表 (文件分析表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 分析记录ID |
| directory_structure_id | INTEGER | FOREIGN KEY (DirectoryStructures.id), NOT NULL | 关联文件ID |
| knowledge_base_id | INTEGER | FOREIGN KEY (KnowledgeBases.id), NOT NULL | 所属知识库ID |
| content | TEXT | NULL | 文件内容(摘要) |
| analysis | TEXT | NULL | AI分析结果 |
| language | VARCHAR(20) | NULL | 代码语言 |
| size | INTEGER | NULL | 文件大小(字节) |
| status | ENUM('pending', 'processing', 'completed', 'failed') | DEFAULT 'pending' | 处理状态 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

### 3.5 ProjectOverviews表 (项目概述表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 概述ID |
| knowledge_base_id | INTEGER | FOREIGN KEY (KnowledgeBases.id), NOT NULL | 所属知识库ID |
| overview | TEXT | NULL | 项目概述 |
| technology_stack | TEXT | NULL | 技术栈 |
| key_features | TEXT | NULL | 核心功能 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

### 3.6 TaskLogs表 (任务日志表)
| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PRIMARY KEY, AUTO_INCREMENT | 日志ID |
| knowledge_base_id | INTEGER | FOREIGN KEY (KnowledgeBases.id), NOT NULL | 所属知识库ID |
| task_type | VARCHAR(50) | NOT NULL | 任务类型 |
| status | ENUM('success', 'failed') | NOT NULL | 任务状态 |
| message | TEXT | NULL | 任务消息 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

## 4. API接口规范

### 4.1 基础规范
- 基础URL: `/api/v1`
- 数据格式: JSON
- 认证方式: JWT (Authorization: Bearer {token})
- 日期格式: ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
- 状态码使用标准HTTP状态码
- 错误响应格式:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "错误描述信息"
    }
  }
  ```

### 4.2 认证相关接口

#### 注册用户
- 接口: `POST /auth/register`
- 请求体:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- 响应 (201 Created):
  ```json
  {
    "id": "integer",
    "username": "string",
    "email": "string",
    "created_at": "string"
  }
  ```

#### 用户登录
- 接口: `POST /auth/login`
- 请求体:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- 响应 (200 OK):
  ```json
  {
    "token": "string",
    "user": {
      "id": "integer",
      "username": "string",
      "email": "string"
    }
  }
  ```

#### 获取当前用户信息
- 接口: `GET /auth/me`
- 请求头: `Authorization: Bearer {token}`
- 响应 (200 OK):
  ```json
  {
    "id": "integer",
    "username": "string",
    "email": "string",
    "created_at": "string",
    "last_login": "string"
  }
  ```

### 4.3 知识库相关接口

#### 获取知识库列表
- 接口: `GET /knowledge-bases`
- 请求头: `Authorization: Bearer {token}`
- 查询参数: 
  - `page`: 页码 (默认1)
  - `limit`: 每页数量 (默认10)
- 响应 (200 OK):
  ```json
  {
    "total": "integer",
    "page": "integer",
    "limit": "integer",
    "data": [
      {
        "id": "integer",
        "name": "string",
        "description": "string",
        "source_type": "string",
        "status": "string",
        "progress": "integer",
        "created_at": "string"
      }
    ]
  }
  ```

#### 创建知识库
- 接口: `POST /knowledge-bases`
- 请求头: `Authorization: Bearer {token}`
- 请求体:
  ```json
  {
    "name": "string",
    "description": "string",
    "source_type": "git|local",
    "source_url": "string", // 当source_type为git时必填
    "branch": "string", // 当source_type为git时可选，默认main
    "files": [/* 文件对象 */] // 当source_type为local时必填
  }
  ```
- 响应 (201 Created):
  ```json
  {
    "id": "integer",
    "name": "string",
    "status": "pending",
    "created_at": "string"
  }
  ```

#### 获取知识库详情
- 接口: `GET /knowledge-bases/:id`
- 请求头: `Authorization: Bearer {token}`
- 响应 (200 OK):
  ```json
  {
    "id": "integer",
    "name": "string",
    "description": "string",
    "source_type": "string",
    "source_url": "string",
    "branch": "string",
    "status": "string",
    "progress": "integer",
    "total_files": "integer",
    "processed_files": "integer",
    "created_at": "string",
    "completed_at": "string"
  }
  ```

#### 删除知识库
- 接口: `DELETE /knowledge-bases/:id`
- 请求头: `Authorization: Bearer {token}`
- 响应 (204 No Content)

#### 获取知识库状态
- 接口: `GET /knowledge-bases/:id/status`
- 请求头: `Authorization: Bearer {token}`
- 响应 (200 OK):
  ```json
  {
    "status": "string",
    "progress": "integer",
    "message": "string",
    "updated_at": "string"
  }
  ```

### 4.4 目录结构相关接口

#### 获取目录结构
- 接口: `GET /knowledge-bases/:id/directory-structure`
- 请求头: `Authorization: Bearer {token}`
- 响应 (200 OK):
  ```json
  {
    "id": "integer",
    "name": "string",
    "type": "directory",
    "children": [
      {
        "id": "integer",
        "name": "string",
        "type": "directory|file",
        "path": "string",
        "children": [/* 嵌套子节点 */]
      }
    ]
  }
  ```

### 4.5 文件分析相关接口

#### 获取文件分析结果
- 接口: `GET /knowledge-bases/:id/files/:fileId`
- 请求头: `Authorization: Bearer {token}`
- 响应 (200 OK):
  ```json
  {
    "id": "integer",
    "name": "string",
    "path": "string",
    "language": "string",
    "size": "integer",
    "analysis": "string",
    "status": "string"
  }
  ```

#### 获取文件内容
- 接口: `GET /knowledge-bases/:id/files/:fileId/content`
- 请求头: `Authorization: Bearer {token}`
- 响应 (200 OK):
  ```json
  {
    "content": "string",
    "truncated": "boolean" // 是否被截断
  }
  ```

### 4.6 项目概述相关接口

#### 获取项目概述
- 接口: `GET /knowledge-bases/:id/overview`
- 请求头: `Authorization: Bearer {token}`
- 响应 (200 OK):
  ```json
  {
    "overview": "string",
    "technology_stack": "string",
    "key_features": "string",
    "updated_at": "string"
  }
  ```

### 4.7 文档导出接口

#### 导出知识库
- 接口: `GET /knowledge-bases/:id/export`
- 请求头: `Authorization: Bearer {token}`
- 响应: 二进制文件流 (Markdown格式)

## 5. 开发优先级

1. **第一阶段**: 核心功能
   - 用户认证系统
   - Git仓库导入功能
   - 基础目录结构展示
   - 简单的AI代码分析

2. **第二阶段**: 完善功能
   - 本地文件上传
   - 完整的文档生成
   - 文档导出功能
   - 错误处理与日志

3. **第三阶段**: 优化与扩展
   - 性能优化
   - UI/UX改进
   - 批量操作功能

## 6. 部署与运维

- 开发环境: Docker Compose本地部署
- 生产环境: Docker容器化部署，可选择云服务提供商
- 数据备份: 每日自动备份数据库
- 监控: 基础健康检查与错误报警

本技术需求文档旨在提供清晰的开发指南，随着项目进展可能会有适当调整。开发团队应遵循文档规范，确保系统设计的一致性和可维护性。
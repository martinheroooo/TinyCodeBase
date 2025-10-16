# 数据模型设计

## 核心实体

### 1. 项目 (Project)
代表一个导入的代码仓库或本地文件夹，包含基本信息和生成的文档。

**属性**:
- `id`: 主键，唯一标识符
- `name`: 项目名称 (字符串，必填)
- `type`: 项目类型 ('git' | 'local', 必填)
- `source`: 源地址 (Git URL或本地路径，必填)
- `status`: 处理状态 ('pending' | 'processing' | 'completed' | 'failed', 必填)
- `created_at`: 创建时间 (时间戳，必填)
- `updated_at`: 最后更新时间 (时间戳，必填)
- `metadata`: 项目元数据 (JSON对象)

**元数据字段**:
```json
{
  "file_count": 150,
  "line_count": 15000,
  "languages": [
    {"name": "JavaScript", "lines": 8000, "percentage": 53.3},
    {"name": "Python", "lines": 5000, "percentage": 33.3},
    {"name": "HTML", "lines": 2000, "percentage": 13.4}
  ],
  "module_count": 12,
  "class_count": 25,
  "function_count": 80
}
```

### 2. 文件 (File)
项目中的单个文件，包含基本信息和分析结果。

**属性**:
- `id`: 主键，唯一标识符
- `project_id`: 关联项目ID (外键，必填)
- `path`: 相对路径 (字符串，必填)
- `name`: 文件名 (字符串，必填)
- `extension`: 文件扩展名 (字符串)
- `language`: 编程语言 (字符串)
- `size`: 文件大小 (字节数，整数)
- `line_count`: 代码行数 (整数)
- `is_binary`: 是否为二进制文件 (布尔值)
- `created_at`: 创建时间 (时间戳，必填)
- `updated_at`: 最后更新时间 (时间戳，必填)

### 3. 文档节点 (DocumentNode)
生成的文档结构节点，对应目录、文件或代码元素。

**属性**:
- `id`: 主键，唯一标识符
- `project_id`: 关联项目ID (外键，必填)
- `file_id`: 关联文件ID (外键，可选)
- `type`: 节点类型 ('directory' | 'file' | 'class' | 'function', 必填)
- `name`: 节点名称 (字符串，必填)
- `path`: 节点路径 (字符串，必填)
- `description`: AI生成的描述 (文本)
- `signature`: 函数签名或类定义 (文本)
- `metadata`: 节点元数据 (JSON对象)
- `created_at`: 创建时间 (时间戳，必填)
- `updated_at`: 最后更新时间 (时间戳，必填)

**元数据示例**:
```json
// 函数节点
{
  "parameters": [
    {"name": "param1", "type": "string", "description": "参数描述"},
    {"name": "param2", "type": "number", "description": "数字参数"}
  ],
  "return_type": "boolean",
  "visibility": "public",
  "start_line": 15,
  "end_line": 25
}

// 类节点
{
  "methods": ["method1", "method2"],
  "properties": ["prop1", "prop2"],
  "extends": "BaseClass",
  "start_line": 1,
  "end_line": 50
}
```

### 4. 处理任务 (ProcessingTask)
代码分析的后台任务记录。

**属性**:
- `id`: 主键，唯一标识符
- `project_id`: 关联项目ID (外键，必填)
- `type`: 任务类型 ('import' | 'analyze' | 'generate_docs', 必填)
- `status`: 任务状态 ('pending' | 'running' | 'completed' | 'failed', 必填)
- `progress`: 进度百分比 (0-100，整数)
- `current_step`: 当前处理步骤 (字符串)
- `message`: 状态消息 (字符串)
- `error_message`: 错误信息 (字符串，可选)
- `started_at**: 开始时间 (时间戳)
- `completed_at**: 完成时间 (时间戳，可选)
- `created_at`: 创建时间 (时间戳，必填)
- `updated_at`: 最后更新时间 (时间戳，必填)

### 5. 搜索索引 (SearchIndex)
用于快速搜索的索引数据。

**属性**:
- `id`: 主键，唯一标识符
- `project_id`: 关联项目ID (外键，必填)
- `document_node_id`: 关联文档节点ID (外键，必填)
- `content`: 索引内容 (文本，必填)
- `content_type`: 内容类型 ('name' | 'description' | 'code', 必填)
- `tokens`: 分词结果 (JSON数组)
- `created_at`: 创建时间 (时间戳，必填)

## 关系图

```
Project (1) ←→ (N) File
Project (1) ←→ (N) DocumentNode
Project (1) ←→ (N) ProcessingTask
File (1) ←→ (N) DocumentNode
DocumentNode (1) ←→ (N) SearchIndex
```

## 数据验证规则

### 项目验证
- name: 必填，长度1-255字符
- source: 必填，有效URL或文件路径
- type: 必填，只能是'git'或'local'

### 文件验证
- path: 必填，不能为空
- name: 必填，不能为空
- size: 必须为非负整数
- line_count: 必须为非负整数

### 文档节点验证
- name: 必填，长度1-500字符
- path: 必填，不能为空
- type: 必填，只能是预定义类型之一

## 状态转换规则

### 项目状态转换
```
pending → processing → completed
pending → processing → failed
completed → processing (重新生成)
failed → pending (重试)
```

### 任务状态转换
```
pending → running → completed
pending → running → failed
```

## 索引策略

### 主要索引
- projects: id (主键), status, created_at
- files: project_id, path, language
- document_nodes: project_id, file_id, type, path
- processing_tasks: project_id, status, created_at
- search_index: project_id, document_node_id, content_type

### 复合索引
- files: (project_id, extension)
- document_nodes: (project_id, type)
- search_index: (project_id, content_type, created_at)

## 数据迁移策略

### 版本控制
- 使用SQLite的ALTER TABLE语句进行增量更新
- 保留向下兼容性，必要时提供数据迁移脚本

### 备份策略
- 定期备份SQLite数据库文件
- 重要文档内容同时保存在文件系统中
- 提供数据导出功能

## 性能优化

### 查询优化
- 使用索引加速常用查询
- 分页查询大量数据
- 缓存频繁访问的数据

### 存储优化
- 大文本内容使用压缩存储
- 定期清理过期数据
- 文件系统存储大文件，数据库只存引用
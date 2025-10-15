---
description: "轻量级AI代码知识库功能实现的任务列表"
---

# 任务清单: 轻量级AI代码知识库

**输入**: 来自 `/specs/001-opendeepwiki-ai-ai/` 的设计文档
**前置条件**: plan.md（必需），spec.md（用户故事必需），research.md，data-model.md，contracts/

**测试**: 功能规格中未明确要求测试，测试任务为可选

**组织方式**: 任务按用户故事分组，以实现每个故事的独立实现和测试。

## 格式: `[ID] [P?] [故事] 描述`
- **[P]**: 可以并行运行（不同文件，无依赖关系）
- **[故事]**: 此任务属于哪个用户故事（例如：US1, US2, US3）
- 描述中包含确切的文件路径

## 路径约定
- **网页应用**: `backend/src/`, `frontend/public/`
- 下面显示的路径根据plan.md结构进行调整

## 阶段1: 设置（共享基础设施）

**目的**: 项目初始化和基本结构

- [ ] T001 创建speckit-mvp项目根目录结构
- [ ] T002 初始化Node.js后端项目，安装Express.js和相关依赖
- [ ] T003 [P] 配置代码检查和格式化工具（ESLint, Prettier）
- [ ] T004 创建环境配置文件（.env.example）和环境变量管理
- [ ] T005 [P] 创建前端基础文件结构（HTML, CSS, JS）
- [ ] T006 配置SQLite数据库文件和初始化脚本
- [ ] T007 [P] 配置开发服务器和热重载功能

---

## 阶段2: 基础设施（阻塞前置条件）

**目的**: 在任何用户故事可以实施之前必须完成的核心基础设施

**⚠️ 关键**: 在此阶段完成之前，无法开始任何用户故事工作

- [ ] T008 设置SQLite数据库模式和迁移框架
- [ ] T009 [P] 创建数据库连接池和基础数据访问层
- [ ] T010 [P] 设置Express.js API路由和中间件结构
- [ ] T011 创建错误处理和日志记录基础设施
- [ ] T012 设置文件上传和临时文件管理
- [ ] T013 [P] 创建项目、文件、文档节点的基础模型
- [ ] T014 [P] 配置大模型API客户端和认证机制
- [ ] T015 设置代码解析器基础框架（Tree-sitter）
- [ ] T016 配置搜索索引和全文搜索基础设施
- [ ] T017 创建异步任务队列和进度管理

**检查点**: 基础设施就绪 - 用户故事实施现在可以并行开始

---

## 阶段3: 用户故事1 - 快速导入代码仓库 (优先级: P1) 🎯 MVP

**目标**: 实现Git仓库和本地文件夹的导入功能，显示处理进度

**独立测试**: 用户可以通过界面导入一个示例代码仓库，验证系统能够成功导入并显示处理进度

### 用户故事1实施

- [ ] T018 [P] [US1] 在backend/src/controllers/projects.js中创建项目控制器
- [ ] T019 [P] [US1] 在backend/src/services/gitService.js中实现Git仓库克隆服务
- [ ] T020 [P] [US1] 在backend/src/services/gitService.js中实现本地文件夹扫描服务
- [ ] T021 [US1] 在backend/src/services/fileService.js中实现文件分析和元数据提取
- [ ] T022 [US1] 在backend/src/models/Project.js中创建项目管理数据模型
- [ ] T023 [P] [US1] 在backend/src/models/File.js中创建文件管理数据模型
- [ ] T024 [US1] 在backend/src/models/ProcessingTask.js中创建任务状态管理模型
- [ ] T025 [US1] 在backend/src/api/routes/projects.js中实现项目相关API端点
- [ ] T026 [US1] 在frontend/public/js/components/ImportForm.js中创建导入表单组件
- [ ] T027 [P] [US1] 在frontend/public/js/components/ProgressBar.js中创建进度显示组件
- [ ] T028 [US1] 在frontend/public/js/app.js中集成项目导入功能
- [ ] T029 [US1] 添加导入错误处理和用户友好的错误信息
- [ ] T030 [US1] 实现导入过程中的实时进度更新机制

**检查点**: 此时，用户故事1应该完全功能化且可独立测试

---

## 阶段4: 用户故事2 - 智能文档生成 (优先级: P1)

**目标**: 实现代码分析和AI文档生成功能，生成结构化文档

**独立测试**: 导入一个简单的代码项目后，验证系统能够生成完整的结构化文档，包含目录树、模块说明和关键函数描述

### 用户故事2实施

- [ ] T031 [P] [US2] 在backend/src/services/parserService.js中实现Tree-sitter代码解析服务
- [ ] T032 [P] [US2] 在backend/src/services/parserService.js中实现多语言支持（JavaScript, Python, Java, Go, C++）
- [ ] T033 [P] [US2] 在backend/src/services/aiService.js中实现大模型API调用服务
- [ ] T034 [US2] 在backend/src/services/aiService.js中实现批量处理和结果缓存机制
- [ ] T035 [US2] 在backend/src/services/documentService.js中实现文档结构生成服务
- [ ] T036 [US2] 在backend/src/models/DocumentNode.js中创建文档节点数据模型
- [ ] T037 [P] [US2] 在backend/src/services/analyzerService.js中实现代码统计分析功能
- [ ] T038 [US2] 在backend/src/api/routes/documents.js中实现文档相关API端点
- [ ] T039 [US2] 在backend/src/api/routes/tasks.js中实现任务状态查询端点
- [ ] T040 [US2] 在frontend/public/js/components/DocumentTree.js中创建文档树组件
- [ ] T041 [P] [US2] 在frontend/public/js/components/ProjectStats.js中创建项目统计组件
- [ ] T042 [US2] 在frontend/public/js/components/NodeDetail.js中创建节点详情组件
- [ ] T043 [US2] 在frontend/public/js/app.js中集成文档浏览功能
- [ ] T044 [US2] 实现文档生成完成后的自动跳转逻辑
- [ ] T045 [US2] 添加文档生成过程中的详细进度显示

**检查点**: 此时，用户故事1和2都应该独立工作

---

## 阶段5: 用户故事3 - 可视化文档浏览 (优先级: P1)

**目标**: 实现友好的文档浏览界面，支持搜索、导航和快速定位关键信息

**独立测试**: 生成了文档的项目应该能够通过界面快速导航，搜索特定功能，并查看相关代码说明

### 用户故事3实施

- [ ] T046 [P] [US3] 在backend/src/services/searchService.js中实现全文搜索服务
- [ ] T047 [P] [US3] 在backend/src/services/searchService.js中实现搜索索引构建和维护
- [ ] T048 [US3] 在backend/src/models/SearchIndex.js中创建搜索索引数据模型
- [ ] T049 [US3] 在backend/src/api/routes/search.js中实现搜索相关API端点
- [ ] T050 [US3] 在frontend/public/js/components/SearchBox.js中创建搜索框组件
- [ ] T051 [P] [US3] 在frontend/public/js/components/SearchResult.js中创建搜索结果组件
- [ ] T052 [US3] 在frontend/public/js/utils/dom.js中创建DOM操作工具函数
- [ ] T053 [P] [US3] 在frontend/public/js/utils/storage.js中创建本地存储工具
- [ ] T054 [US3] 在frontend/public/js/components/HighlightText.js中创建文本高亮组件
- [ ] T055 [US3] 在frontend/public/js/app.js中集成搜索功能
- [ ] T056 [US3] 实现搜索结果的实时更新和分页显示
- [ ] T057 [US3] 添加搜索历史记录和快速访问功能
- [ ] T058 [US3] 实现键盘快捷键支持（Ctrl+F搜索）

**检查点**: 所有用户故事现在都应该独立功能化

---

## 阶段6: 用户故事4 - 项目管理 (优先级: P2)

**目标**: 实现多项目管理功能，包括重新生成、删除和统计信息

**独立测试**: 用户可以创建多个项目，在项目管理界面中进行基本的项目操作

### 用户故事4实施

- [ ] T059 [P] [US4] 在backend/src/services/projectService.js中实现项目管理服务
- [ ] T060 [US4] 在backend/src/services/exportService.js中实现文档导出服务
- [ ] T061 [US4] 在backend/src/api/routes/export.js中实现导出相关API端点
- [ ] T062 [US4] 在frontend/public/js/components/ProjectList.js中创建项目列表组件
- [ ] T063 [P] [US4] 在frontend/public/js/components/ProjectCard.js中创建项目卡片组件
- [ ] T064 [US4] 在frontend/public/js/components/ExportDialog.js中创建导出对话框组件
- [ ] T065 [US4] 在frontend/public/js/app.js中集成项目管理功能
- [ ] T066 [US4] 实现项目重新生成和状态更新功能
- [ ] T067 [US4] 实现项目删除确认和数据清理
- [ ] T068 [US4] 实现项目统计信息显示
- [ ] T069 [US4] 添加项目批量操作功能

---

## 阶段7: 完善与横切关注点

**目的**: 影响多个用户故事的改进

- [ ] T070 [P] 在backend/src/utils/logger.js中实现结构化日志记录
- [ ] T071 [P] 在backend/src/utils/performance.js中实现性能监控
- [ ] T072 [P] 在backend/src/utils/validators.js中实现输入验证和清理
- [ ] T073 [P] 在frontend/public/css/style.css中完善响应式设计和UI优化
- [ ] T074 [P] 在frontend/public/css/components.css中完善组件样式
- [ ] T075 [P] 在docs/中创建API文档和部署指南
- [ ] T076 [P] 在frontend/public/js/utils/api.js中完善API调用封装
- [ ] T077 [P] 在frontend/public/js/utils/errorHandler.js中完善错误处理
- [ ] T078 [P] 实现数据备份和恢复功能
- [ ] T079 [P] 实现系统健康检查和监控
- [ ] T080 运行完整的功能测试和性能测试

---

## 依赖关系与执行顺序

### 阶段依赖关系

- **设置（阶段1）**: 无依赖 - 可以立即开始
- **基础设施（阶段2）**: 依赖于设置完成 - 阻塞所有用户故事
- **用户故事（阶段3-6）**: 都依赖于基础设施阶段完成
  - 用户故事1-3（P1）可以并行进行
  - 用户故事4（P2）依赖于P1故事的基础功能
- **完善（阶段7）**: 依赖于所有期望的用户故事完成

### 用户故事依赖关系

- **用户故事1（P1）**: 可在基础设施（阶段2）后开始 - 无其他故事依赖
- **用户故事2（P1）**: 可在基础设施（阶段2）后开始 - 依赖于用户故事1的项目管理功能
- **用户故事3（P1）**: 可在基础设施（阶段2）后开始 - 依赖于用户故事1和2的文档数据
- **用户故事4（P2）: 可在基础设施（阶段2）后开始 - 依赖于用户故事1-3的核心功能

### 每个用户故事内部

- 模型在服务之前
- 服务在端点之前
- 核心实施在集成之前
- 故事完成后再进行下一个优先级

### 并行机会

- 所有标记为[P]的设置任务可以并行运行
- 所有标记为[P]的基础设施任务可以并行运行（在阶段2内）
- 基础设施阶段完成后，用户故事1-3（P1）可以并行开始
- 用户故事的所有标记为[P]的服务和模型可以并行运行
- 用户故事1-3的前端组件可以并行开发
- 不同用户故事的前端集成可以由不同团队成员并行处理

---

## 并行示例：用户故事1

```bash
# 同时启动用户故事1的模型和服务：
任务: "在backend/src/models/Project.js中创建项目管理数据模型"
任务: "在backend/src/models/File.js中创建文件管理数据模型"
任务: "在backend/src/models/ProcessingTask.js中创建任务状态管理模型"

# 同时启动用户故事1的前端组件：
任务: "在frontend/public/js/components/ImportForm.js中创建导入表单组件"
任务: "在frontend/public/js/components/ProgressBar.js中创建进度显示组件"
```

---

## 实施策略

### 首先MVP（仅用户故事1）

1. 完成阶段1：设置
2. 完成阶段2：基础设施（关键 - 阻塞所有故事）
3. 完成阶段3：用户故事1
4. **停止并验证**: 独立测试用户故事1
5. 如果准备就绪则部署/演示

### 增量交付

1. 完成设置 + 基础设施 → 基础设施就绪
2. 添加用户故事1 → 独立测试 → 部署/演示（MVP！）
3. 添加用户故事2 → 独立测试 → 部署/演示
4. 添加用户故事3 → 独立测试 → 部署/演示
5. 添加用户故事4 → 独立测试 → 部署/演示
6. 每个故事在不破坏先前故事的情况下增加价值

### 并行团队策略

拥有多个开发人员时：

1. 团队一起完成设置 + 基础设施
2. 基础设施完成后：
   - 开发人员A：用户故事1（导入功能）
   - 开发人员B：用户故事2（文档生成）
   - 开发人员C：用户故事3（搜索浏览）
3. 用户故事4（项目管理）可以后期添加或由现有成员完成
4. 故事独立完成和集成

---

## 备注

- [P]任务 = 不同文件，无依赖关系
- [故事]标签将任务映射到特定用户故事以便追溯
- 每个用户故事应该可以独立完成和测试
- 在实施前验证测试失败（如果包含测试）
- 在每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊任务、相同文件冲突、破坏独立性的跨故事依赖

## 总计任务数量

**总任务数**: 80个
- 阶段1（设置）: 7个任务
- 阶段2（基础设施）: 10个任务
- 阶段3（用户故事1）: 13个任务
- 阶段4（用户故事2）: 15个任务
- 阶段5（用户故事3）: 13个任务
- 阶段6（用户故事4）: 11个任务
- 阶段7（完善）: 11个任务

**并行机会**: 约65%的任务可以并行执行，显著提升开发效率。

**MVP核心功能**: 阶段1-3完成用户故事1即可提供完整的核心价值。
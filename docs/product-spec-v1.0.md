# TinyCodeRAG v1.0 产品规格文档

## 1. 产品背景和目标

### 1.1 产品背景
TinyCodeRAG MVP版本已经实现了核心的AI代码知识库功能，但在稳定性、性能和用户体验方面仍有提升空间。v1.0版本的目标是将MVP打磨成稳定可用的产品，为后续版本奠定坚实基础。

### 1.2 产品目标
- **稳定性**：完善错误处理，提高系统可靠性
- **完整性**：补充本地文件上传功能，支持更多使用场景
- **可维护性**：添加日志监控，便于问题排查
- **安全性**：加强安全防护，保护用户数据

## 2. 用户故事和使用场景

### 2.1 用户故事

**用户故事1**：作为开发者，我希望系统能够稳定处理各种Git仓库，包括私有仓库和特殊分支，这样我就可以分析所有项目代码。

**用户故事2**：作为用户，当我上传本地代码文件夹时，系统应该能够快速解析并生成文档，而不需要先推送到Git仓库。

**用户故事3**：作为系统管理员，我希望能够查看系统运行日志，及时发现和解决问题。

**用户故事4**：作为开发者，我希望得到清晰的错误提示，知道如何解决导入失败的问题。

### 2.2 使用场景

#### 场景1：稳定的Git仓库导入
用户输入一个私有Git仓库URL，系统支持HTTPS认证，能够处理网络波动和认证失败，并提供详细的错误原因。

#### 场景2：本地项目快速分析
用户拖拽本地项目文件夹到上传区域，系统自动识别项目类型，过滤无关文件，快速生成代码分析报告。

#### 场景3：实时处理进度反馈
用户创建知识库后，系统能够实时显示处理进度，包括"正在克隆仓库"、"正在分析文件"、"处理完成"等状态。

## 3. 功能需求列表

### 3.1 完善错误处理（P0）

| 模块 | 具体需求 | 实现要点 |
|------|----------|----------|
| Git操作 | 1. 支持HTTPS认证的私有仓库<br>2. 网络超时重试机制<br>3. 分支不存在时自动fallback到main/master<br>4. 仓库过大时的友好提示 | - 添加认证参数支持<br>- 实现指数退避重试<br>- 分支验证和切换逻辑<br>- 文件数量预警 |
| AI分析 | 1. API调用失败自动重试<br>2. Token超限处理<br>3. 分析超时处理<br>4. 部分失败时的降级处理 | - 重试队列机制<br>- Token使用监控<br>- 超时中断机制<br>- 失败文件标记 |
| 文件处理 | 1. 大文件跳过机制<br>2. 特殊编码处理<br>3. 二进制文件识别<br>4. 权限错误处理 | - 文件大小阈值配置<br>- 编码自动检测<br>- 文件类型白名单<br>- 错误恢复机制 |

### 3.2 系统监控和日志（P0）

| 模块 | 具体需求 | 实现要点 |
|------|----------|----------|
| 日志系统 | 1. 请求日志记录<br>2. 错误日志分级<br>3. 日志文件轮转<br>4. 结构化日志格式 | - Winston日志集成<br>- Log级别管理<br>- 文件大小限制<br>- JSON格式输出 |
| 监控面板 | 1. 系统健康状态<br>2. API响应时间<br>3. 错误率统计<br>4. 资源使用情况 | - 健康检查端点<br>- 性能指标收集<br>- 错误统计看板<br>- 系统资源监控 |

### 3.3 本地文件上传（P0）

| 模块 | 具体需求 | 实现要点 |
|------|----------|----------|
| 上传功能 | 1. 拖拽上传支持<br>2. 多文件批量上传<br>3. 上传进度显示<br>4. 文件类型验证 | - HTML5拖拽API<br>- 并发上传控制<br>- 进度事件监听<br>- MIME类型检查 |
| 压缩包处理 | 1. ZIP/RAR解压支持<br>2. 压缩包病毒扫描<br>3. 解压进度显示<br>4. 内存使用控制 | - 解压库集成<br>- 安全扫描接口<br>- 流式解压处理<br>- 内存限制机制 |

### 3.4 性能优化（P1）

| 模块 | 具体需求 | 实现要点 |
|------|----------|----------|
| 数据库优化 | 1. 查询索引优化<br>2. 批量操作优化<br>3. 连接池管理<br>4. 查询缓存 | - 添加必要索引<br>- 批量插入/更新<br>- 连接池配置<br>- Redis缓存层 |
| 前端优化 | 1. 资源懒加载<br>2. 组件缓存<br>3. 请求合并<br>4. 渲染优化 | - Intersection Observer<br>- 组件状态缓存<br>- API请求去重<br>- 虚拟滚动列表 |

## 4. 交互流程图

### 4.1 增强的知识库创建流程
```
┌─────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  用户   │     │    前端界面    │     │    服务端     │     │    外部服务    │
└───┬─────┘     └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
    │                   │                     │                     │
    │ 1. 输入仓库信息    │                     │                     │
    │ (URL/本地文件)     │                     │                     │
    ├───────────────────►                     │                     │
    │                   │ 2. 验证输入格式      │                     │
    │                   ├─────────────────────►                     │
    │                   │                     │ 3. 克隆/接收文件    │
    │                   │                     │ (带重试机制)        │
    │ 4. 显示实时进度    │                     │                     │
    │◄───────────────────                     │                     │
    │                   │                     │ 5. 扫描和分析文件   │
    │                   │                     │ (错误标记和降级)    │
    │                   │                     │ 6. AI分析(带重试)   │
    │                   │                     ├─────────────────────►
    │                   │                     │ 7. 记录详细日志     │
    │                   │                     │ (成功/失败)         │
    │ 8. 显示完整结果    │                     │                     │
    │ (包含错误信息)     │                     │                     │
    │◄───────────────────                     │                     │
```

## 5. 技术实现要点

### 5.1 错误处理增强
```javascript
// 示例：Git操作错误处理
class GitService {
  async cloneRepository(url, branch = 'main', retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await this.git.clone(url, this.tempDir, [
          '--branch', branch,
          '--depth', '1'
        ]);
        return result;
      } catch (error) {
        if (i === retries - 1) {
          // 最后一次尝试失败
          throw new Error(`Failed to clone repository: ${error.message}`);
        }
        // 指数退避
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }
}
```

### 5.2 日志系统配置
```javascript
// Winston日志配置
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});
```

### 5.3 文件上传处理
```javascript
// 文件上传控制器
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = `uploads/${req.user.id}`;
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'text/plain',
      'application/javascript'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

## 6. 测试计划

### 6.1 单元测试
- Git服务测试（各种错误场景）
- AI服务测试（重试和降级）
- 文件处理测试（边界情况）
- 错误处理测试

### 6.2 集成测试
- 完整的创建知识库流程
- 错误恢复机制
- 日志记录验证
- 性能压力测试

### 6.3 用户验收测试
- 真实项目导入测试
- 大文件处理测试
- 错误场景用户体验
- 性能满意度测试

## 7. 发布标准

### 7.1 必须满足的条件
- 所有核心功能测试通过
- 错误覆盖率 > 90%
- 性能指标达标
- 安全扫描通过

### 7.2 发布检查清单
- [ ] 代码审查完成
- [ ] 测试报告通过
- [ ] 文档更新完成
- [ ] 部署脚本准备就绪
- [ ] 回滚方案准备

## 8. 风险评估

### 8.1 技术风险
- **风险**：AI API成本超预期
- **缓解**：实现智能缓存和使用限制

### 8.2 进度风险
- **风险**：本地文件上传功能复杂度超出预期
- **缓解**：分阶段实现，先支持基础上传

### 8.3 质量风险
- **风险**：错误处理覆盖不全面
- **缓解**：全面的测试用例和错误注入测试

## 9. 成功指标

- 系统可用性 > 99%
- 错误率 < 1%
- 用户导入成功率 > 95%
- 平均响应时间 < 2秒

## 10. 附录

### 10.1 术语表
- **知识库**：包含代码分析和文档的项目集合
- **AI分析**：使用OpenAI API对代码进行智能分析
- **错误降级**：当部分功能失败时，保证核心功能可用

### 10.2 参考资料
- Winston文档：https://github.com/winstonjs/winston
- Multer文档：https://github.com/expressjs/multer
- OpenAI API文档：https://platform.openai.com/docs
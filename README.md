# TinyCodeRAG

> 从RAG到Agent，从零构建代码智能系统的完整实践

本项目是一个轻量级的代码智能系统，包含了RAG（检索增强生成）、Agent（智能代理）和评估系统的完整实现。项目从TinyRAG扩展而来，专注于代码场景的优化和实践。

## 📚 项目文章系列

本仓库包含四篇深度技术文章，记录了从RAG到Agent的完整构建过程：

### 1. [手把手构建TinyCodeRAG：轻量级代码知识库解决方案](https://codemls.com/articles/25-06-18-build-tiny-code-rag)
- 📅 2025-06-18
- 🎯 **RAG系统构建**
- 📖 详细介绍如何从零构建专为代码优化的RAG系统
- 🔧 涵盖向量化、代码分块、向量存储、LLM封装等核心模块

### 2. [从零开始搭建一个属于自己的Agent](https://codemls.com/articles/25-06-28-build-tiny-agent)
- 📅 2025-06-28  
- 🎯 **Agent系统构建**
- 🤖 基于ReAct范式实现智能代理
- 🛠️ 包含工具调用、代码检查、谷歌搜索等功能

### 3. [之前有多嫌弃大模型框架，现在用 LangGraph 就有多香](https://codemls.com/articles/25-09-02-langgraph)
- 📅 2025-08-05
- 🎯 **LangGraph框架实践**  
- 📈 从手写Agent到LangGraph框架的进化
- 💾 涵盖基础聊天、工具调用、记忆管理等核心功能

### 4. [Human-in-the-loop 如何拯救智能体的骚操作？](https://codemls.com/articles/25-09-08-human-in-the-loop)
- 📅 2025-09-08
- 🎯 **人类在环机制**
- 🚦 详解智能体安全控制的关键技术
- 🔧 基于LangGraph实现可控的智能体决策流程

## 🏗️ 项目结构

```
TinyCodeBase/
├── 🔍 RAG/ - 检索增强生成系统
│   ├── embeddings.py          # 向量化引擎
│   ├── chunker_text.py         # 通用文本分割器
│   ├── chunker_code.py         # 代码专用分割器 ⭐
│   ├── vector_base.py          # 轻量向量数据库
│   ├── llm.py                  # LLM接口封装
│   ├── tiny_code_rag.py        # RAG系统整合
│   └── test_*.py               # 各模块测试文件
└── 🤖 agent/ - 智能体
    ├── agent.py                           # ReAct范式Agent
    ├── agent_langgraph.py                 # LangGraph框架Agent
    ├── agent_langgraph_human_in_the_loop.py  # 人类在环Agent ⭐
    ├── tools.py                           # 工具函数集合
    ├── tree_sitter_parser.py              # 代码解析器
    └── test_agent.py                      # Agent测试

```

## ✨ 核心特性

### RAG系统
✅ **代码智能分块**：专门解析代码数据结构，构建精准向量集  
✅ **开箱即用**：提供专用的测试API key  
✅ **模块化测试**：每个组件都有独立测试用例，更适合新手学习  
✅ **对话体验优化**：完整支持多轮上下文对话  

### Agent系统
🤖 **ReAct范式**：思考-行动-观察-总结的完整流程  
🔍 **谷歌搜索**：基于Serper API的实时信息检索  
🛠️ **代码检查**：基于TreeSitter的语法错误检测  
🔄 **工具调用**：灵活的外部工具集成机制  

### LangGraph框架
📊 **状态管理**：清晰的状态定义和流转控制  
🔧 **工具集成**：简化的工具调用和条件分支  
💾 **记忆系统**：短期记忆(Checkpointer)和长期记忆(Store)  
🎨 **可视化**：自动生成Agent流程图  
🚦 **人类在环**：关键决策节点的安全控制机制  

## 🚀 快速开始

### 1. 环境准备
```bash
git clone https://github.com/codemilestones/TinyCodeBase.git
cd TinyCodeBase
pip install -r requirements.txt
```

### 2. 体验RAG系统
```bash
cd RAG
python tiny_code_rag.py
```

### 3. 体验Agent系统
```bash
cd agent
python agent.py                           # ReAct范式Agent
python agent_langgraph.py                 # LangGraph框架Agent
python agent_langgraph_human_in_the_loop.py  # 人类在环Agent
```

## 🔗 相关链接

- **原始项目**: [TinyRAG](https://github.com/datawhalechina/tiny-universe/tree/main/content/TinyRAG)
- **博客地址**: [代码里程碑](https://codemls.com)
- **技术交流**: 欢迎提交Issue和PR

## 🎯 项目价值

这个项目不仅仅是代码实现，更是一个**完整的学习资源**：
- 📝 **理论与实践结合**：每个模块都有对应的技术文章
- 🧪 **可运行的代码**：所有示例都经过测试验证  
- 📈 **渐进式学习**：从基础RAG到高级Agent的完整路径
- 🛠️ **生产就绪**：包含评估系统和完整的工程实践

✨ **欢迎Star/Fork/Issue三连！你的反馈是我持续优化的动力~**
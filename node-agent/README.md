# Node Agent

Node.js implementation of the ReAct-style agent in `agent/agent.py`.

## File Map

| Python | Node.js |
| --- | --- |
| `agent.py` | `agentNode.js` |
| `agent_llm.py` | `agentLlm.js` |
| `tools.py` | `toolsNode.js` |
| `tree_sitter_parser.py` | `treeSitterParser.js` |
| `config.py` | `config.js` |
| `env_utils.py` | `envUtils.js` |
| `aihubmix_embedding.py` | `dashscopeEmbedding.js` |
| `agent_langgraph.py` | `agentLanggraph.js` |
| `agent_langgraph_human_in_the_loop.py` | `agentLanggraphHumanInTheLoop.js` |
| `test_agent.py` | `testAgent.js` |

## Run

Create or update the root `.env` file:

```bash
DASHSCOPE_API_KEY=sk-xxx
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
SERPER_API_KEY=your-serper-key
```

Run the agent:

```bash
node node-agent/agentNode.js
```

Run the memory demo:

```bash
node node-agent/agentLanggraph.js
```

Run the human confirmation demo:

```bash
node node-agent/agentLanggraphHumanInTheLoop.js
```

Pass a custom question:

```bash
node node-agent/agentNode.js "请检查这段 JavaScript 代码是否有问题：console.log('hello')"
```

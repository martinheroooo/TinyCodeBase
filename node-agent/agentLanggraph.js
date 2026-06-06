const AgentConfig = require("./config");
const AgentLLM = require("./agentLlm");

class MemoryStore {
  constructor() {
    this.data = new Map();
  }

  put(namespace, key, value) {
    this.data.set(`${namespace.join("/")}:${key}`, value);
  }

  search(namespace, query, limit = 1) {
    const prefix = `${namespace.join("/")}:`;
    const results = [];
    for (const [key, value] of this.data.entries()) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const text = JSON.stringify(value).toLowerCase();
      if (!query || text.includes(String(query).toLowerCase())) {
        results.push({ key: key.slice(prefix.length), value });
      }
      if (results.length >= limit) {
        break;
      }
    }
    return results;
  }
}

async function run() {
  const config = new AgentConfig();
  const llm = new AgentLLM({ model: config.modelName });
  const store = new MemoryStore();
  const namespace = ["users", "memories"];

  store.put(namespace, "user_123", {
    name: "John Smith",
    language: "English",
    food_preference: "I like pizza",
  });

  const userQuestion = "do you know my name?";
  const memories = store.search(namespace, "John Smith", 1);
  const memoryText = JSON.stringify(memories.map((item) => item.value));

  const prompt = `Known user memories: ${memoryText}

User question: ${userQuestion}

Answer using the known memories if relevant.`;

  const [response] = await llm.chat(prompt, [], "");
  console.log(response);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  MemoryStore,
  run,
};

const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");

const AgentConfig = require("./config");
const AgentLLM = require("./agentLlm");
const Tools = require("./toolsNode");

async function askConfirmation(query) {
  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      const answer = (await rl.question("请输入 (y/n 或 是/否): "))
        .trim()
        .toLowerCase();
      if (["y", "yes", "是", "同意"].includes(answer)) {
        return true;
      }
      if (["n", "no", "否", "拒绝"].includes(answer)) {
        return false;
      }
      console.log("请输入有效选项: y/n 或 是/否");
    }
  } finally {
    rl.close();
  }
}

async function run() {
  const config = new AgentConfig();
  const llm = new AgentLLM({ model: config.modelName });
  const tools = new Tools();
  const userInput = "北京明天的天气如何？";

  console.log("🤖 用户:", userInput);
  console.log("\n============================================================");
  console.log("第一阶段：AI 分析用户请求并准备搜索...");
  console.log("============================================================");

  const planningPrompt = `User asks: ${userInput}

Return only the concise search query needed to answer the question.`;
  const [searchQuery] = await llm.chat(planningPrompt, [], "");
  const query = searchQuery.trim().replace(/^["']|["']$/g, "");

  console.log(`🔍 AI 想要搜索: '${query}'`);
  console.log("是否允许执行这次搜索？");

  const approved = await askConfirmation(query);
  if (!approved) {
    console.log("❌ 用户拒绝了搜索");
    return;
  }

  console.log("✅ 用户批准了搜索");
  console.log("\n============================================================");
  console.log("第三阶段：执行搜索并返回结果...");
  console.log("============================================================");

  const searchResult = await tools.googleSearch({ search_query: query });
  const [finalAnswer] = await llm.chat(
    `User question: ${userInput}

Search result: ${searchResult}

Answer the user in Chinese.`,
    [],
    ""
  );

  console.log(`🤖 AI: ${finalAnswer}`);
  console.log("\n============================================================");
  console.log("演示完成！");
  console.log("============================================================");
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  run,
};

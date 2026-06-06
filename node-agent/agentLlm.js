const { DASHSCOPE_BASE_URL, getEnv } = require("./envUtils");

class AgentLLM {
  constructor({ model } = {}) {
    this.model = model || getEnv("DASHSCOPE_MODEL", "qwen-plus");
    this.apiKey = getEnv("DASHSCOPE_API_KEY");
    this.baseUrl = getEnv("DASHSCOPE_BASE_URL", DASHSCOPE_BASE_URL);
  }

  async chat(prompt, history = [], metaInstruction = "") {
    if (!this.apiKey) {
      throw new Error("DASHSCOPE_API_KEY is not set");
    }

    const messages = [];
    if (metaInstruction) {
      messages.push({ role: "system", content: metaInstruction });
    }
    messages.push(...history);
    messages.push({ role: "user", content: prompt });

    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    const newHistory = history.concat([
      { role: "user", content: prompt },
      { role: "assistant", content: aiResponse },
    ]);

    return [aiResponse, newHistory];
  }
}

module.exports = AgentLLM;

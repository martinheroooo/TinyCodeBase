const { DASHSCOPE_BASE_URL, getEnv } = require("./envUtils");

class DashScopeEmbedding {
  constructor({
    apiKey = getEnv("DASHSCOPE_API_KEY"),
    baseUrl = getEnv("DASHSCOPE_BASE_URL", DASHSCOPE_BASE_URL),
    model = getEnv("DASHSCOPE_EMBEDDING_MODEL", "text-embedding-v4"),
  } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async embedDocuments(texts) {
    return this.createEmbeddings(texts);
  }

  async embedQuery(text) {
    const embeddings = await this.createEmbeddings([text]);
    return embeddings[0];
  }

  async createEmbeddings(texts) {
    if (!this.apiKey) {
      throw new Error("DASHSCOPE_API_KEY is not set");
    }

    const cleanedTexts = texts.map((text) => String(text).replace(/\n/g, " "));
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/embeddings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: cleanedTexts,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Embedding request failed: ${response.status} ${await response.text()}`
      );
    }

    const data = await response.json();
    return data.data.map((item) => item.embedding);
  }
}

module.exports = DashScopeEmbedding;

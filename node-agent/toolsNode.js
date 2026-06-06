const { getEnv } = require("./envUtils");
const { checkCode } = require("./treeSitterParser");

class Tools {
  constructor() {
    this.toolConfig = this.tools();
  }

  tools() {
    return [
      {
        name_for_human: "谷歌搜索",
        name_for_model: "google_search",
        description_for_model:
          "谷歌搜索是一个通用搜索引擎，可用于访问互联网、查询百科知识、了解时事新闻等。",
        parameters: [
          {
            name: "search_query",
            description: "搜索关键词或短语",
            required: true,
            schema: { type: "string" },
          },
        ],
      },
      {
        name_for_human: "代码检查",
        name_for_model: "code_check",
        description_for_model:
          "代码检查是一个代码检查工具，可用于检查代码的错误和问题。",
        parameters: [
          {
            name: "language",
            description: "语言类型全称",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "source_code",
            description: "源代码",
            required: true,
            schema: { type: "string" },
          },
        ],
      },
    ];
  }

  async googleSearch({ search_query: searchQuery }) {
    const apiKey = getEnv("SERPER_API_KEY") || getEnv("GOOGLE_SEARCH_API_KEY");
    if (!apiKey) {
      throw new Error("SERPER_API_KEY is not set");
    }

    const response = await fetch(
      "https://google.serper.dev/search",
      {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: searchQuery }),
      }
    );

    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.organic?.[0]?.snippet || "No search result found.";
  }

  codeCheck({ language, source_code: sourceCode }) {
    return checkCode(language, sourceCode);
  }
}

module.exports = Tools;

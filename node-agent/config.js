const { DASHSCOPE_BASE_URL, getEnv } = require("./envUtils");

class AgentConfig {
  constructor({
    modelName = getEnv("DASHSCOPE_MODEL", "qwen-plus"),
    temperature = 0.1,
    maxTokens = 4000,
    apiKey = getEnv("DASHSCOPE_API_KEY"),
    baseUrl = getEnv("DASHSCOPE_BASE_URL", DASHSCOPE_BASE_URL),
    maxIterations = 10,
    timeout = 300,
    enableLogging = true,
    logLevel = "INFO",
  } = {}) {
    this.modelName = modelName;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.maxIterations = maxIterations;
    this.timeout = timeout;
    this.enableLogging = enableLogging;
    this.logLevel = logLevel;
  }
}

module.exports = AgentConfig;

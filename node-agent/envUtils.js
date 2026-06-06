const fs = require("fs");
const path = require("path");

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadProjectEnv() {
  parseEnvFile(path.join(__dirname, ".env"));
  parseEnvFile(path.join(__dirname, "..", ".env"));
}

function getEnv(name, defaultValue = undefined) {
  loadProjectEnv();
  return process.env[name] || defaultValue;
}

module.exports = {
  DASHSCOPE_BASE_URL,
  getEnv,
  loadProjectEnv,
};

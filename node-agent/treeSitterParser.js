const { spawnSync } = require("child_process");

const supportedLanguages = [
  "python",
  "javascript",
  "typescript",
  "js",
  "ts",
];

function checkCode(language, code) {
  const normalized = String(language || "").toLowerCase();
  if (!supportedLanguages.includes(normalized)) {
    return "language not supported";
  }

  if (["javascript", "js", "typescript", "ts"].includes(normalized)) {
    try {
      new Function(`"use strict";\n${code}`);
      return "code compile success";
    } catch (error) {
      return `code compile error: ${error.message}`;
    }
  }

  const script =
    "import sys\nsource = sys.stdin.read()\ncompile(source, '<agent-input>', 'exec')\n";
  const result = spawnSync("python3", ["-c", script], {
    input: code,
    encoding: "utf8",
  });

  if (result.status === 0) {
    return "code compile success";
  }
  return `code compile error: ${(result.stderr || result.stdout).trim()}`;
}

module.exports = {
  checkCode,
  supportedLanguages,
};

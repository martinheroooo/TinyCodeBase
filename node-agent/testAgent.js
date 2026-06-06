const Agent = require("./agentNode");

async function testAgent(question) {
  const agent = new Agent();
  const [response] = await agent.textCompletion(question);
  console.log("-".repeat(100));
  console.log("final response:\n");
  console.log(response);
  console.log("-".repeat(100));
}

if (require.main === module) {
  const question =
    process.argv.slice(2).join(" ").trim() ||
    `
function helloWorld() {
  console.log("Hello, World!");
}

function helloWorld2() {
  console.log("Hello, World2!")

请修复这段代码的错误
`;

  testAgent(question).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = testAgent;

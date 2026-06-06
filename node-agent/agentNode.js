const AgentLLM = require("./agentLlm");
const Tools = require("./toolsNode");

const TOOL_DESC =
  "{name_for_model}: Call this tool to interact with the {name_for_human} API. What is the {name_for_human} API useful for? {description_for_model} Parameters: {parameters} Format the arguments as a JSON object.";

const REACT_PROMPT = `Answer the following questions as best you can. You have access to the following tools:

{tool_descs}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can be repeated zero or more times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!
`;

function formatTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
}

class Agent {
  constructor() {
    this.tool = new Tools();
    this.systemPrompt = this.buildSystemInput();
    this.model = new AgentLLM();
  }

  buildSystemInput() {
    const toolDescs = [];
    const toolNames = [];

    for (const tool of this.tool.toolConfig) {
      toolDescs.push(
        formatTemplate(TOOL_DESC, {
          ...tool,
          parameters: JSON.stringify(tool.parameters),
        })
      );
      toolNames.push(tool.name_for_model);
    }

    const systemPrompt = formatTemplate(REACT_PROMPT, {
      tool_descs: toolDescs.join("\n\n"),
      tool_names: toolNames.join(","),
    });

    console.log(`${"-".repeat(10)}system_prompt${"-".repeat(10)}`);
    console.log(systemPrompt);
    console.log(`${"-".repeat(10)}system_prompt${"-".repeat(10)}`);
    return systemPrompt;
  }

  parseLatestPluginCall(text) {
    let pluginName = "";
    let pluginArgs = "";
    const i = text.lastIndexOf("\nAction:");
    const j = text.lastIndexOf("\nAction Input:");
    let k = text.lastIndexOf("\nObservation:");

    if (i >= 0 && i < j) {
      if (k < j) {
        text = `${text.trimEnd()}\nObservation:`;
      }
      k = text.lastIndexOf("\nObservation:");
      pluginName = text.slice(i + "\nAction:".length, j).trim();
      pluginArgs = text.slice(j + "\nAction Input:".length, k).trim();
      text = text.slice(0, k);
    }

    return [pluginName, pluginArgs, text];
  }

  async callPlugin(pluginName, pluginArgsText) {
    const pluginArgs = JSON.parse(pluginArgsText);

    console.log(`${"-".repeat(10)}call_plugin${"-".repeat(10)}`);
    console.log("plugin_name:", pluginName);
    console.log("plugin_args:", pluginArgs);
    console.log(`${"-".repeat(10)}call_plugin${"-".repeat(10)}`);

    if (pluginName === "google_search") {
      return `\nObservation:${await this.tool.googleSearch(pluginArgs)}`;
    }
    if (pluginName === "code_check") {
      return `\nObservation:${this.tool.codeCheck(pluginArgs)}`;
    }
    return `\nObservation:unknown tool ${pluginName}`;
  }

  async textCompletion(text, history = []) {
    text = `\nQuestion:${text}`;
    let [response, nextHistory] = await this.model.chat(
      text,
      history,
      this.systemPrompt
    );

    console.log("first response:\n");
    console.log(response);
    console.log("-".repeat(100));

    const [pluginName, pluginArgs, parsedResponse] =
      this.parseLatestPluginCall(response);
    response = parsedResponse;

    if (pluginName) {
      const functionCallResult = await this.callPlugin(pluginName, pluginArgs);
      console.log(`${"=".repeat(10)}function_call_result${"=".repeat(10)}`);
      console.log(functionCallResult);
      console.log(`${"=".repeat(10)}function_call_result${"=".repeat(10)}`);
      response += functionCallResult;
    }

    return this.model.chat(response, nextHistory, this.systemPrompt);
  }
}

async function main() {
  const question =
    process.argv.slice(2).join(" ").trim() ||
    "请检查这段 JavaScript 代码是否有问题：console.log('hello tiny codebase')";
  const agent = new Agent();
  const [response] = await agent.textCompletion(question);
  console.log(response);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = Agent;

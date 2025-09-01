from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict
from typing import Annotated, Callable, Any, Dict
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI

from config import AgentConfig

main_agent_config = AgentConfig(
    model_name="Doubao-1.5-lite-32k",
    temperature=0.1,
    max_tokens=4000,
)

class State(TypedDict):
    messages: Annotated[list, add_messages]

if __name__ == "__main__":
    graph = StateGraph(State)

    llm = ChatOpenAI(
        model=main_agent_config.model_name,
        temperature=main_agent_config.temperature,
        max_tokens=main_agent_config.max_tokens,
        openai_api_key=main_agent_config.openai_api_key,
        openai_api_base=main_agent_config.openai_base_url,
    )

    def chat_node(state: State):
        result = llm.invoke(state["messages"])
        return {"messages": [result]}
    
    graph.add_node("chat", chat_node)

    graph.add_edge(START, "chat")
    graph.add_edge("chat", END)

    app = graph.compile()
    result = app.invoke({"messages": [{"role": "user", "content": "你好呀朋友"}]})
    print(result.get("messages", [])[-1].content)

    # 保存图片到本地
    graph_image = app.get_graph().draw_mermaid_png(output_file_path="agent_graph.png")
    print("图表已保存到: agent_graph.png")
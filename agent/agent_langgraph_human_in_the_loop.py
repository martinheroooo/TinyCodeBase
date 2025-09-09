from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict
from typing import Annotated, Callable, Any, Dict
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import ToolNode,tools_condition
from aihubmix_embedding import AIHubMixEmbedding
from config import AgentConfig
from tools import Tools
from langgraph.checkpoint.memory import InMemorySaver
import sqlite3
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.store.memory import InMemoryStore
from langgraph.types import Command, interrupt



main_agent_config = AgentConfig(
    model_name="Doubao-1.5-lite-32k",
    temperature=0.1,
    max_tokens=4000,
)

class State(TypedDict):
    messages: Annotated[list, add_messages]

if __name__ == "__main__":
    memory = InMemorySaver()

    graph = StateGraph(State)

    llm = ChatOpenAI(
        model=main_agent_config.model_name,
        temperature=main_agent_config.temperature,
        max_tokens=main_agent_config.max_tokens,
        openai_api_key=main_agent_config.openai_api_key,
        openai_api_base=main_agent_config.openai_base_url,
    )

    def human_assistance(query: str) -> str:
        """Request assistance from a human."""
        human_response = interrupt({"query": query})
        return human_response["data"]

    tools = [human_assistance]
    llm_with_tools = llm.bind_tools(tools)

    def chat_node(state: State):
        result = llm_with_tools.invoke(state["messages"])
        # 确保只有一个工具调用
        assert len(result.tool_calls) <= 1
        return {"messages": [result]}
    
    graph.add_node("chat", chat_node)
    graph.add_node("tools", ToolNode(tools))

    graph.add_edge(START, "chat")
    graph.add_conditional_edges(
        "chat",
        tools_condition,  # Routes to "tools" or "__end__"
        {"tools": "tools", "__end__": "__end__"}
    )
    graph.add_edge("tools", "chat")
    graph.add_edge("chat", END)

    app = graph.compile(checkpointer=memory)
    user_input = "I need some expert guidance for building an AI agent. Could you request assistance for me?"
    config = {"configurable": {"thread_id": "1"}}

    events = app.stream(
        {"messages": [{"role": "user", "content": user_input}]},
        config,
        stream_mode="values",
    )
    for event in events:
        if "messages" in event:
            event["messages"][-1].pretty_print()

    human_response = (
        "We, the experts are here to help! We'd recommend you check out LangGraph to build your agent."
        " It's much more reliable and extensible than simple autonomous agents."
    )

    human_command = Command(resume={"data": human_response})

    events = app.stream(human_command, config, stream_mode="values")
    for event in events:
        if "messages" in event:
            event["messages"][-1].pretty_print()
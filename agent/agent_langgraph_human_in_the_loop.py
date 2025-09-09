from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import ToolNode, tools_condition
from config import AgentConfig
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command, interrupt
from tavily import TavilyClient



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

    def search_with_confirmation(query: str) -> str:
        """
        使用 Tavily 搜索，但需要人类确认才能执行搜索。
        类似于 Claude Code 中执行 Shell 命令前的确认机制。
        """
        # 请求人类确认是否执行搜索
        confirmation = interrupt({
            "type": "search_confirmation",
            "query": query,
            "message": f"🔍 AI 想要搜索: '{query}'\n\n是否允许执行这次搜索？"
        })
        
        if not confirmation.get("approved", False):
            return "搜索被用户取消。"
        
        try:
            # 初始化 Tavily 客户端
            # 注意：需要设置 TAVILY_API_KEY 环境变量
            tavily = TavilyClient(api_key="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")
            
            # 执行搜索
            search_result = tavily.search(query, max_results=3)
            
            # 格式化搜索结果
            formatted_results = []
            for result in search_result.get("results", []):
                formatted_results.append(f"标题: {result.get('title', 'N/A')}")
                formatted_results.append(f"链接: {result.get('url', 'N/A')}")
                formatted_results.append(f"摘要: {result.get('content', 'N/A')[:200]}...")
                formatted_results.append("-" * 50)
            
            return "搜索结果：\n\n" + "\n".join(formatted_results)
            
        except Exception as e:
            return f"搜索时发生错误: {str(e)}"

    tools = [search_with_confirmation]
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
    
    # 用户询问需要搜索的问题
    user_input = "北京明天的天气如何？"
    config = {"configurable": {"thread_id": "search_demo"}}
    
    print("🤖 用户: ", user_input)
    print("\n" + "="*60)
    print("第一阶段：AI 分析用户请求并准备搜索...")
    print("="*60)

    # 第一次执行：AI 会分析用户请求并准备调用搜索工具
    events = list(app.stream(
        {"messages": [{"role": "user", "content": user_input}]},
        config,
        stream_mode="values",
    ))
    
    for event in events:
        if "messages" in event:
            latest_message = event["messages"][-1]
            if hasattr(latest_message, 'content') and latest_message.content:
                print(f"🤖 AI: {latest_message.content}")
            if hasattr(latest_message, 'tool_calls') and latest_message.tool_calls:
                print(f"🔧 AI 准备调用工具: {latest_message.tool_calls}")

    print("\n" + "="*60)
    print("第二阶段：等待用户确认搜索...")
    print("="*60)

    # 检查是否有搜索请求需要确认
    search_query = None
    for event in events:
        if "messages" in event:
            latest_message = event["messages"][-1]
            if hasattr(latest_message, 'tool_calls') and latest_message.tool_calls:
                # 从工具调用中提取搜索查询
                search_query = latest_message.tool_calls[0]['args']['query']
                break

    if search_query:
        print(f"🔍 AI 想要搜索: '{search_query}'")
        print("是否允许执行这次搜索？")

        # 等待用户真实输入
        while True:
            user_input_confirm = input("请输入 (y/n 或 是/否): ").strip().lower()
            if user_input_confirm in ['y', 'yes', '是', '同意']:
                approved = True
                print("✅ 用户批准了搜索")
                break
            elif user_input_confirm in ['n', 'no', '否', '拒绝']:
                approved = False
                print("❌ 用户拒绝了搜索")
                break
            else:
                print("请输入有效选项: y/n 或 是/否")
        
        human_approval = {"approved": approved}
    else:
        print("ℹ️ 没有需要确认的搜索请求")
        human_approval = {"approved": True}
    
    human_command = Command(resume=human_approval)

    print("\n" + "="*60)
    if search_query and human_approval.get("approved", False):
        print("第三阶段：执行搜索并返回结果...")
    elif search_query:
        print("第三阶段：处理用户拒绝的搜索请求...")
    else:
        print("第三阶段：处理用户请求...")
    print("="*60)

    # 第二次执行：从中断点恢复，执行搜索
    events = app.stream(human_command, config, stream_mode="values")
    for event in events:
        if "messages" in event:
            latest_message = event["messages"][-1]
            if hasattr(latest_message, 'content') and latest_message.content:
                print(f"🤖 AI: {latest_message.content}")

    print("\n" + "="*60)
    print("演示完成！")
    print("="*60)
    print("💡 这个例子展示了如何在 AI 调用工具前获得人类确认，")
    print("   就像 Claude Code 中执行 Shell 命令前的确认机制一样。")
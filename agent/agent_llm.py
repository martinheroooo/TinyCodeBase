#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@File    :   agent_llm.py
@Time    :   2025/06/24 10:00:00
@Author  :   codemilestones
@Version :   1.0
@Desc    :   Agent LLM
'''
from typing import Optional

from env_utils import DASHSCOPE_BASE_URL, get_env


class AgentLLM:
    def __init__(self, path: str = '', model: Optional[str] = None) -> None:
        self.model = model or get_env("DASHSCOPE_MODEL", "qwen-plus")
        self.api_key = get_env("DASHSCOPE_API_KEY")
        self.base_url = get_env("DASHSCOPE_BASE_URL", DASHSCOPE_BASE_URL)

    def chat(self, prompt: str, history: list[dict], meta_instruction: str) -> tuple[str, list[dict]]:
        from openai import OpenAI

        if not self.api_key:
            raise RuntimeError("DASHSCOPE_API_KEY is not set")

        client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

        messages = []
        if meta_instruction:
            messages.append({"role": "system", "content": meta_instruction})
        for entry in history:
            messages.append(entry)
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.1
        )

        ai_response = response.choices[0].message.content
        new_history = history.copy()
        new_history.append({"role": "user", "content": prompt})
        new_history.append({"role": "assistant", "content": ai_response})

        return ai_response, new_history

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from pathlib import Path
from typing import Optional

DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


def load_project_env() -> None:
    if not load_dotenv:
        return

    agent_dir = Path(__file__).resolve().parent
    load_dotenv(agent_dir / ".env")
    load_dotenv(agent_dir.parent / ".env")


def get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    load_project_env()
    return os.getenv(name, default)

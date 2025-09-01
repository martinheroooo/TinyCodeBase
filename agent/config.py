from dataclasses import dataclass
from typing import Dict, Any, Optional
import os

@dataclass
class AgentConfig:
    """Agent主配置"""
    # LLM配置
    model_name: str = "Doubao-1.5-lite-32k"
    temperature: float = 0.1
    max_tokens: int = 4000000
    
    # API配置
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    
    # 系统配置
    max_iterations: int = 10
    timeout: int = 300
    enable_logging: bool = True
    log_level: str = "INFO"
    
    def __post_init__(self):
        """初始化后处理"""
        # 从环境变量加载API密钥
        if self.openai_api_key is None:
            self.openai_api_key = "sk-En8qPIGvNTidf5kvE0F44dC4CfC248A384D34428EaF116Bb"
        
        if self.openai_base_url is None:
            self.openai_base_url = "https://aihubmix.com/v1"
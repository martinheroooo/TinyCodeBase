#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''
@File    :   aihubmix_embedding.py
@Time    :   2025/01/27 10:00:00
@Author  :   codemilestones
@Version :   1.0
@Desc    :   AIHubMix Embedding implementation for LangChain
'''

from typing import List, Optional
from langchain_core.embeddings import Embeddings
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)


class AIHubMixEmbedding(Embeddings):
    """
    AIHubMix Embedding class that implements LangChain's Embeddings interface
    """
    
    def __init__(
        self,
        api_key: str = "sk-gZZFW6G63FCG3LvoFe700862425e4aF2BbC49495443e93B5",
        base_url: str = "https://aihubmix.com/v1",
        model: str = "text-embedding-3-small",
        max_retries: int = 3,
        timeout: Optional[float] = None,
        **kwargs
    ):
        """
        Initialize AIHubMix Embedding client
        
        Args:
            api_key: AIHubMix API key
            base_url: AIHubMix API base URL
            model: Embedding model name
            max_retries: Maximum number of retries for failed requests
            timeout: Request timeout in seconds
            **kwargs: Additional parameters
        """
        super().__init__(**kwargs)
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.max_retries = max_retries
        self.timeout = timeout
        
        # Initialize OpenAI client with AIHubMix configuration
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            max_retries=self.max_retries,
            timeout=self.timeout
        )
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of documents
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        try:
            # Clean texts by replacing newlines with spaces
            cleaned_texts = [text.replace("\n", " ") for text in texts]
            
            # Call AIHubMix embedding API
            response = self.client.embeddings.create(
                input=cleaned_texts,
                model=self.model
            )
            
            # Extract embeddings from response
            embeddings = [data.embedding for data in response.data]
            
            logger.info(f"Successfully embedded {len(texts)} documents")
            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to embed documents: {str(e)}")
            raise RuntimeError(f"Failed to embed documents: {str(e)}")
    
    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single query text
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        try:
            # Clean text by replacing newlines with spaces
            cleaned_text = text.replace("\n", " ")
            
            # Call AIHubMix embedding API
            response = self.client.embeddings.create(
                input=[cleaned_text],
                model=self.model
            )
            
            # Extract embedding from response
            embedding = response.data[0].embedding
            
            logger.debug(f"Successfully embedded query: {text[:50]}...")
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to embed query: {str(e)}")
            raise RuntimeError(f"Failed to embed query: {str(e)}")
    
    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Async version of embed_documents
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        # For now, use sync version. Could implement true async later
        return self.embed_documents(texts)
    
    async def aembed_query(self, text: str) -> List[float]:
        """
        Async version of embed_query
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        # For now, use sync version. Could implement true async later
        return self.embed_query(text)
    
    @property
    def dimension(self) -> int:
        """
        Get the dimension of the embedding vectors
        
        Returns:
            Dimension of embedding vectors
        """
        # text-embedding-3-small has 1536 dimensions
        if "3-small" in self.model:
            return 1536
        elif "3-large" in self.model:
            return 3072
        elif "ada-002" in self.model:
            return 1536
        else:
            # Default dimension, might need adjustment for other models
            return 1536
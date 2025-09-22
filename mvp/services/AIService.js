const OpenAI = require('openai');
const logger = require('./Logger');

class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const apiEndpoint = process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1';
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: apiEndpoint
    });
    
    console.log(`AI Service initialized with endpoint: ${apiEndpoint}`);
  }

  async analyzeCode(fileName, fileContent, language) {
    if (!fileContent || fileContent.length === 0) {
      return {
        analysis: 'File is empty or could not be read.',
        language: language || 'Unknown'
      };
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      console.log(`OpenAI API key not configured for endpoint ${process.env.OPENAI_API_ENDPOINT}, using fallback analysis`);
      return {
        analysis: this.generateFallbackAnalysis(fileName, fileContent, language),
        language: language || 'Unknown'
      };
    }

    const prompt = this.createAnalysisPrompt(fileName, fileContent, language);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code analyst. Provide concise, insightful analysis of code files. Focus on functionality, key components, and purpose.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const analysis = response.choices[0]?.message?.content || 'Analysis failed';
      
      return {
        analysis: analysis.trim(),
        language: language || 'Unknown'
      };
    } catch (error) {
      console.error(`Error analyzing code with ${process.env.OPENAI_API_ENDPOINT}:`, error.message);
      await logger.logAIOperation('analyzeCode', false, { 
        fileName, 
        error: error.message,
        endpoint: process.env.OPENAI_API_ENDPOINT 
      });
      
      // Fallback analysis if API fails
      return {
        analysis: this.generateFallbackAnalysis(fileName, fileContent, language),
        language: language || 'Unknown'
      };
    }
  }

  createAnalysisPrompt(fileName, fileContent, language) {
    const truncatedContent = this.truncateContent(fileContent);
    
    return `Please analyze this ${language} file named "${fileName}":

${truncatedContent}

Provide a brief analysis covering:
1. What this file does and its main purpose
2. Key functions, classes, or components
3. Important patterns or architectural decisions
4. Any notable dependencies or imports

Keep your response under 200 words and focus on the most important aspects.`;
  }

  truncateContent(content, maxLength = 2000) {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Try to truncate at a reasonable point (like a function or class boundary)
    const truncated = content.substring(0, maxLength);
    const lastLineBreak = truncated.lastIndexOf('\n');
    
    if (lastLineBreak > maxLength * 0.8) {
      return truncated.substring(0, lastLineBreak) + '\n...[truncated]';
    }
    
    return truncated + '...[truncated]';
  }

  generateFallbackAnalysis(fileName, fileContent, language) {
    const lines = fileContent.split('\n').length;
    const hasFunctions = /function\s+\w+|def\s+\w+|class\s+\w+/.test(fileContent);
    const hasImports = /import|require|include/.test(fileContent);
    
    let analysis = `${fileName} is a ${language} file with ${lines} lines of code.`;
    
    if (hasFunctions) {
      analysis += ' It contains functions or classes.';
    }
    
    if (hasImports) {
      analysis += ' It imports external dependencies.';
    }
    
    analysis += ' This appears to be a source code file that implements specific functionality.';
    
    return analysis;
  }

  async batchAnalyzeFiles(files) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Analyzing file ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const result = await this.analyzeCode(file.name, file.content, file.language);
        results.push({
          directory_structure_id: file.directory_structure_id,
          analysis: result.analysis,
          language: result.language,
          status: 'completed'
        });
      } catch (error) {
        console.error(`Error analyzing file ${file.name}:`, error);
        results.push({
          directory_structure_id: file.directory_structure_id,
          analysis: 'Analysis failed',
          language: file.language || 'Unknown',
          status: 'failed'
        });
      }
      
      // Small delay to avoid rate limiting
      await this.delay(1000);
    }
    
    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async ragQuery(knowledgeBase, question, relevantFiles = []) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return {
        answer: 'AI service is not configured. Please set up your OpenAI API key to enable AI-powered responses.',
        sources: []
      };
    }

    // Prepare context from relevant files
    let context = 'Repository Information:\n';
    context += `- Name: ${knowledgeBase.name}\n`;
    context += `- Source: ${knowledgeBase.source_url}\n`;
    context += `- Branch: ${knowledgeBase.branch}\n\n`;

    if (relevantFiles.length > 0) {
      context += 'Relevant Files:\n\n';
      relevantFiles.forEach((file, index) => {
        context += `File ${index + 1}: ${file.path}\n`;
        context += `Language: ${file.language || 'Unknown'}\n`;
        context += `Analysis: ${file.analysis}\n\n`;
      });
    }

    const prompt = `Based on the following repository information and file analyses, please answer the user's question.

${context}

User Question: ${question}

Instructions:
1. Provide a comprehensive answer based on the available repository information
2. If the information is not sufficient to answer the question, acknowledge this limitation
3. Be specific and reference relevant files when possible
4. Keep your response focused on the repository content and structure
5. If asking about implementation details, mention what information is available in the analysis

Answer:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant helping users understand code repositories. Use the provided file analyses and repository information to answer questions accurately and helpfully.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const answer = response.choices[0]?.message?.content || 'Unable to generate response.';
      
      return {
        answer: answer.trim(),
        sources: relevantFiles.map(file => ({
          path: file.path,
          language: file.language
        }))
      };
    } catch (error) {
      console.error('Error in RAG query:', error);
      await logger.logAIOperation('ragQuery', false, { 
        question, 
        error: error.message,
        knowledgeBase: knowledgeBase.name 
      });
      return {
        answer: 'Sorry, I encountered an error while processing your question. Please try again later.',
        sources: []
      };
    }
  }

  async searchRelevantFiles(knowledgeBaseId, question, structure) {
    // Simple keyword matching for relevant files
    const questionWords = question.toLowerCase().split(/\s+/);
    const relevantFiles = [];

    structure.forEach(item => {
      if (item.type === 'file' && item.FileAnalysis) {
        let relevanceScore = 0;
        
        // Check if question words appear in file path or analysis
        const textToSearch = `${item.path} ${item.FileAnalysis.analysis}`.toLowerCase();
        
        questionWords.forEach(word => {
          if (word.length > 2 && textToSearch.includes(word)) {
            relevanceScore++;
          }
        });

        if (relevanceScore > 0) {
          relevantFiles.push({
            ...item.toJSON(),
            relevanceScore
          });
        }
      }
    });

    // Sort by relevance and return top matches
    return relevantFiles
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
      .map(item => ({
        path: item.path,
        language: item.FileAnalysis.language,
        analysis: item.FileAnalysis.analysis
      }));
  }
}

module.exports = AIService;
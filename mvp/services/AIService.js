const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeCode(fileName, fileContent, language) {
    if (!fileContent || fileContent.length === 0) {
      return {
        analysis: 'File is empty or could not be read.',
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
      console.error('Error analyzing code with OpenAI:', error);
      
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
}

module.exports = AIService;
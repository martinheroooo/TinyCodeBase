const GitService = require('./GitService');
const DirectoryScanner = require('./DirectoryScanner');
const AIService = require('./AIService');
const logger = require('./Logger');
const { sequelize, KnowledgeBase, DirectoryStructure, FileAnalysis } = require('../models');

class KnowledgeBaseService {
  constructor() {
    this.gitService = new GitService();
    this.directoryScanner = new DirectoryScanner();
    this.aiService = new AIService();
  }

  async createKnowledgeBase(userId, name, sourceUrl, branch = 'main') {
    const transaction = await sequelize.transaction();
    
    try {
      // Create knowledge base record
      const knowledgeBase = await KnowledgeBase.create({
        user_id: userId,
        name,
        source_url: sourceUrl,
        branch,
        status: 'pending',
        progress: 0
      }, { transaction });

      await transaction.commit();
      
      // Log knowledge base creation
      await logger.logKnowledgeBaseOperation('create', knowledgeBase.id, userId, {
        name,
        sourceUrl,
        branch
      });
      
      // Start async processing
      this.processKnowledgeBase(knowledgeBase.id).catch(error => {
        console.error(`Error processing knowledge base ${knowledgeBase.id}:`, error);
        logger.error(`Knowledge base processing failed`, { 
          knowledgeBaseId: knowledgeBase.id, 
          error: error.message 
        });
        this.updateKnowledgeBaseStatus(knowledgeBase.id, 'failed', 0);
      });
      
      return knowledgeBase;
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating knowledge base:', error);
      throw error;
    }
  }

  async processKnowledgeBase(knowledgeBaseId) {
    try {
      const knowledgeBase = await KnowledgeBase.findByPk(knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error('Knowledge base not found');
      }

      // Step 1: Clone repository
      await this.updateKnowledgeBaseStatus(knowledgeBaseId, 'cloning', 10);
      const repoPath = await this.gitService.cloneRepository(
        knowledgeBase.source_url, 
        knowledgeBase.branch
      );

      // Step 2: Scan directory structure
      await this.updateKnowledgeBaseStatus(knowledgeBaseId, 'scanning', 30);
      const directoryStructure = await this.directoryScanner.scanDirectory(repoPath, knowledgeBaseId);
      
      // Save directory structure to database
      const savedStructure = await this.saveDirectoryStructure(directoryStructure, knowledgeBaseId);
      
      // Step 3: Analyze files
      await this.updateKnowledgeBaseStatus(knowledgeBaseId, 'analyzing', 60);
      const importantFiles = await this.directoryScanner.getImportantFiles(savedStructure);
      
      const analysisResults = await this.analyzeFiles(importantFiles, repoPath);
      await this.saveAnalysisResults(analysisResults);
      
      // Step 4: Complete
      await this.updateKnowledgeBaseStatus(knowledgeBaseId, 'completed', 100);
      
      // Clean up
      await this.gitService.cleanup(repoPath);
      
      console.log(`Knowledge base ${knowledgeBaseId} processed successfully`);
      await logger.logKnowledgeBaseOperation('process_complete', knowledgeBaseId, null, {
        totalFiles: directoryStructure.length
      });
    } catch (error) {
      console.error(`Error processing knowledge base ${knowledgeBaseId}:`, error);
      await logger.logKnowledgeBaseOperation('process_failed', knowledgeBaseId, null, {
        error: error.message
      });
      await this.updateKnowledgeBaseStatus(knowledgeBaseId, 'failed', 0);
      throw error;
    }
  }

  async saveDirectoryStructure(structure, knowledgeBaseId) {
    const savedItems = [];
    
    for (let i = 0; i < structure.length; i++) {
      const item = structure[i];
      
      // Map parent_id to actual database IDs
      let parentId = null;
      if (item.parent_id !== null) {
        const parentItem = structure[item.parent_id];
        const parentSaved = savedItems.find(si => si.name === parentItem.name && si.path === parentItem.path);
        if (parentSaved) {
          parentId = parentSaved.id;
        }
      }
      
      const savedItem = await DirectoryStructure.create({
        knowledge_base_id: knowledgeBaseId,
        parent_id: parentId,
        name: item.name,
        type: item.type,
        path: item.path
      });
      
      savedItems.push(savedItem);
    }
    
    return savedItems;
  }

  async analyzeFiles(files, repoPath) {
    const filesToAnalyze = [];
    
    for (const file of files) {
      const fullPath = require('path').join(repoPath, file.path);
      const content = await this.directoryScanner.getFileContent(fullPath);
      const language = this.directoryScanner.detectLanguage(file.name);
      
      filesToAnalyze.push({
        directory_structure_id: file.id,
        name: file.name,
        content,
        language
      });
      
      // Update progress
      const progress = 60 + (filesToAnalyze.length / files.length) * 30;
      await this.updateKnowledgeBaseProgress(files[0].knowledge_base_id, Math.min(progress, 90));
    }
    
    return await this.aiService.batchAnalyzeFiles(filesToAnalyze);
  }

  async saveAnalysisResults(analysisResults) {
    for (const result of analysisResults) {
      await FileAnalysis.create({
        directory_structure_id: result.directory_structure_id,
        analysis: result.analysis,
        language: result.language,
        status: result.status
      });
    }
  }

  async updateKnowledgeBaseStatus(knowledgeBaseId, status, progress) {
    await KnowledgeBase.update(
      { status, progress },
      { where: { id: knowledgeBaseId } }
    );
  }

  async updateKnowledgeBaseProgress(knowledgeBaseId, progress) {
    await KnowledgeBase.update(
      { progress },
      { where: { id: knowledgeBaseId } }
    );
  }

  async getUserKnowledgeBases(userId) {
    return await KnowledgeBase.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']]
    });
  }

  async getKnowledgeBaseById(knowledgeBaseId, userId) {
    return await KnowledgeBase.findOne({
      where: { 
        id: knowledgeBaseId,
        user_id: userId
      }
    });
  }

  async getKnowledgeBaseStructure(knowledgeBaseId, userId) {
    const knowledgeBase = await this.getKnowledgeBaseById(knowledgeBaseId, userId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    return await DirectoryStructure.findAll({
      where: { knowledge_base_id: knowledgeBaseId },
      include: [{
        model: FileAnalysis,
        required: false
      }],
      order: [['path', 'ASC']]
    });
  }

  async deleteKnowledgeBase(knowledgeBaseId, userId) {
    const knowledgeBase = await this.getKnowledgeBaseById(knowledgeBaseId, userId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }
    
    await FileAnalysis.destroy({
      where: {
        directory_structure_id: {
          $in: sequelize.literal(`(SELECT id FROM DirectoryStructures WHERE knowledge_base_id = ${knowledgeBaseId})`)
        }
      }
    });
    
    await DirectoryStructure.destroy({
      where: { knowledge_base_id: knowledgeBaseId }
    });
    
    await KnowledgeBase.destroy({
      where: { id: knowledgeBaseId, user_id: userId }
    });
    
    return true;
  }

  async exportDocumentation(knowledgeBaseId, userId) {
    const knowledgeBase = await this.getKnowledgeBaseById(knowledgeBaseId, userId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }

    const structure = await this.getKnowledgeBaseStructure(knowledgeBaseId, userId);
    
    // Generate markdown documentation
    const markdown = this.generateMarkdownDocumentation(knowledgeBase, structure);
    
    return markdown;
  }

  generateMarkdownDocumentation(knowledgeBase, structure) {
    const date = new Date().toLocaleDateString();
    let markdown = `# ${knowledgeBase.name}\n\n`;
    
    markdown += `## Repository Information\n\n`;
    markdown += `- **Source URL:** ${knowledgeBase.source_url}\n`;
    markdown += `- **Branch:** ${knowledgeBase.branch}\n`;
    markdown += `- **Generated:** ${date}\n`;
    markdown += `- **Status:** ${knowledgeBase.status}\n\n`;
    
    // Build tree structure for display
    const tree = this.buildTree(structure);
    markdown += `## Directory Structure\n\n`;
    markdown += this.renderMarkdownTree(tree);
    
    // Add file analyses
    const analyzedFiles = structure.filter(item => item.type === 'file' && item.analysis_status === 'completed');
    
    if (analyzedFiles.length > 0) {
      markdown += `## File Analysis\n\n`;
      
      analyzedFiles.forEach(file => {
        markdown += `### ${file.path}\n\n`;
        markdown += `**Language:** ${file.language || 'Unknown'}\n\n`;
        markdown += `${file.analysis}\n\n`;
        markdown += `---\n\n`;
      });
    }
    
    // Summary
    const totalFiles = structure.filter(item => item.type === 'file').length;
    const analyzedCount = analyzedFiles.length;
    const directories = structure.filter(item => item.type === 'directory').length;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Files:** ${totalFiles}\n`;
    markdown += `- **Analyzed Files:** ${analyzedCount}\n`;
    markdown += `- **Directories:** ${directories}\n`;
    markdown += `- **Analysis Coverage:** ${totalFiles > 0 ? Math.round((analyzedCount / totalFiles) * 100) : 0}%\n\n`;
    
    markdown += `---\n`;
    markdown += `\n*Generated by TinyCodeRAG - AI-powered code knowledge base tool*\n`;
    
    return markdown;
  }

  buildTree(items) {
    const itemMap = {};
    const root = [];

    items.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });

    items.forEach(item => {
      const node = itemMap[item.id];
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(node);
      } else {
        root.push(node);
      }
    });

    return root;
  }

  renderMarkdownTree(nodes, level = 0) {
    return nodes.map(node => {
      const indent = '  '.repeat(level);
      const icon = node.type === 'directory' ? '📁' : '📄';
      const hasAnalysis = node.type === 'file' && node.analysis_status === 'completed';
      const suffix = hasAnalysis ? ' ✅' : '';
      
      let output = `${indent}${icon} ${node.name}${suffix}\n`;
      
      if (node.children && node.children.length > 0) {
        output += this.renderMarkdownTree(node.children, level + 1);
      }
      
      return output;
    }).join('');
  }

  async queryKnowledgeBase(knowledgeBaseId, userId, question) {
    const knowledgeBase = await this.getKnowledgeBaseById(knowledgeBaseId, userId);
    if (!knowledgeBase) {
      throw new Error('Knowledge base not found');
    }

    if (knowledgeBase.status !== 'completed') {
      throw new Error('Knowledge base is still being processed. Please wait until analysis is complete.');
    }

    // Get knowledge base structure with file analyses
    const structure = await this.getKnowledgeBaseStructure(knowledgeBaseId, userId);
    
    // Search for relevant files
    const relevantFiles = await this.aiService.searchRelevantFiles(knowledgeBaseId, question, structure);
    
    // Generate RAG response
    const response = await this.aiService.ragQuery(knowledgeBase, question, relevantFiles);
    
    // Log the RAG query
    await logger.logKnowledgeBaseOperation('rag_query', knowledgeBaseId, userId, {
      question,
      relevantFilesCount: relevantFiles.length,
      sourcesCount: response.sources.length
    });
    
    return {
      answer: response.answer,
      sources: response.sources,
      question: question,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = KnowledgeBaseService;
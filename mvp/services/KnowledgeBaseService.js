const GitService = require('./GitService');
const DirectoryScanner = require('./DirectoryScanner');
const AIService = require('./AIService');
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
      
      // Start async processing
      this.processKnowledgeBase(knowledgeBase.id).catch(error => {
        console.error(`Error processing knowledge base ${knowledgeBase.id}:`, error);
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
    } catch (error) {
      console.error(`Error processing knowledge base ${knowledgeBaseId}:`, error);
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
      order: [['created_at', 'DESC']]
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
}

module.exports = KnowledgeBaseService;
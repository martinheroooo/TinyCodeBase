const express = require('express');
const authenticateToken = require('../middleware/auth');
const KnowledgeBaseService = require('../services/KnowledgeBaseService');

const router = express.Router();
const knowledgeBaseService = new KnowledgeBaseService();

// Create knowledge base
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, source_url, branch = 'main' } = req.body;
    
    if (!name || !source_url) {
      return res.status(400).json({ error: 'Name and source_url are required' });
    }
    
    const knowledgeBase = await knowledgeBaseService.createKnowledgeBase(
      req.user.id,
      name,
      source_url,
      branch
    );
    
    res.status(201).json({
      message: 'Knowledge base created successfully',
      knowledge_base: {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        source_url: knowledgeBase.source_url,
        branch: knowledgeBase.branch,
        status: knowledgeBase.status,
        progress: knowledgeBase.progress,
        created_at: knowledgeBase.created_at
      }
    });
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get user's knowledge bases
router.get('/', authenticateToken, async (req, res) => {
  try {
    const knowledgeBases = await knowledgeBaseService.getUserKnowledgeBases(req.user.id);
    
    res.json({
      knowledge_bases: knowledgeBases.map(kb => ({
        id: kb.id,
        name: kb.name,
        source_url: kb.source_url,
        branch: kb.branch,
        status: kb.status,
        progress: kb.progress,
        created_at: kb.created_at
      }))
    });
  } catch (error) {
    console.error('Error getting knowledge bases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get knowledge base by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const knowledgeBase = await knowledgeBaseService.getKnowledgeBaseById(
      req.params.id,
      req.user.id
    );
    
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }
    
    res.json({
      knowledge_base: {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        source_url: knowledgeBase.source_url,
        branch: knowledgeBase.branch,
        status: knowledgeBase.status,
        progress: knowledgeBase.progress,
        created_at: knowledgeBase.created_at
      }
    });
  } catch (error) {
    console.error('Error getting knowledge base:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get knowledge base structure
router.get('/:id/structure', authenticateToken, async (req, res) => {
  try {
    const structure = await knowledgeBaseService.getKnowledgeBaseStructure(
      req.params.id,
      req.user.id
    );
    
    res.json({
      structure: structure.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        path: item.path,
        parent_id: item.parent_id,
        analysis: item.FileAnalysis?.analysis || null,
        language: item.FileAnalysis?.language || null,
        analysis_status: item.FileAnalysis?.status || null
      }))
    });
  } catch (error) {
    console.error('Error getting knowledge base structure:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get knowledge base status
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const knowledgeBase = await knowledgeBaseService.getKnowledgeBaseById(
      req.params.id,
      req.user.id
    );
    
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }
    
    res.json({
      status: knowledgeBase.status,
      progress: knowledgeBase.progress
    });
  } catch (error) {
    console.error('Error getting knowledge base status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export knowledge base documentation
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const documentation = await knowledgeBaseService.exportDocumentation(
      req.params.id,
      req.user.id
    );
    
    res.json({
      documentation: documentation
    });
  } catch (error) {
    console.error('Error exporting documentation:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Query knowledge base (RAG)
router.post('/:id/query', authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (question.length > 500) {
      return res.status(400).json({ error: 'Question is too long. Maximum 500 characters.' });
    }
    
    const response = await knowledgeBaseService.queryKnowledgeBase(
      req.params.id,
      req.user.id,
      question
    );
    
    res.json(response);
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    
    if (error.message === 'Knowledge base not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('still being processed')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete knowledge base
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await knowledgeBaseService.deleteKnowledgeBase(req.params.id, req.user.id);
    
    res.json({ message: 'Knowledge base deleted successfully' });
  } catch (error) {
    console.error('Error deleting knowledge base:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;
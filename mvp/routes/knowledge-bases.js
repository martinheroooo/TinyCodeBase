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
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;

class GitService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  validateGitUrl(url) {
    const gitRegex = /^https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[^\/]+\/[^\/]+(\.git)?$/;
    return gitRegex.test(url);
  }

  async cloneRepository(url, branch = 'main') {
    if (!this.validateGitUrl(url)) {
      throw new Error('Invalid Git URL. Only GitHub, GitLab, and Bitbucket URLs are supported.');
    }

    const repoName = this.extractRepoName(url);
    const targetPath = path.join(this.tempDir, repoName);

    // Clean up existing directory if it exists
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, continue
    }

    try {
      console.log(`Cloning ${url} to ${targetPath}`);
      
      const git = simpleGit();
      await git.clone(url, targetPath, ['--branch', branch]);
      
      // Switch to specific branch if different from default
      if (branch !== 'main') {
        const repoGit = simpleGit(targetPath);
        await repoGit.checkout(branch);
      }

      console.log(`Repository cloned successfully to ${targetPath}`);
      return targetPath;
    } catch (error) {
      console.error('Error cloning repository:', error);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  extractRepoName(url) {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const repoName = pathParts[pathParts.length - 1];
    
    // Remove .git extension if present
    return repoName.replace(/\.git$/, '');
  }

  async cleanup(repoPath) {
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
      console.log(`Cleaned up ${repoPath}`);
    } catch (error) {
      console.error('Error cleaning up repository:', error);
    }
  }
}

module.exports = GitService;
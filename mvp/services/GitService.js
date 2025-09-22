const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./Logger');

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
      throw new Error('Invalid Git URL format. Please provide a valid GitHub, GitLab, or Bitbucket repository URL.');
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
      console.log(`Cloning ${url} (branch: ${branch}) to ${targetPath}`);
      
      const git = simpleGit();
      let clonedBranch = null;
      
      // Try to clone with specified branch first
      try {
        await git.clone(url, targetPath, ['--branch', branch, '--depth', '1']);
        clonedBranch = branch;
        console.log(`Successfully cloned branch '${branch}'`);
      } catch (cloneError) {
        console.log(`Failed to clone branch '${branch}': ${cloneError.message}`);
        
        // If main branch fails, try master branch
        if (branch === 'main') {
          try {
            console.log(`Attempting to clone 'master' branch instead...`);
            await git.clone(url, targetPath, ['--branch', 'master', '--depth', '1']);
            clonedBranch = 'master';
            console.log(`Successfully cloned branch 'master'`);
          } catch (masterError) {
            throw new Error(`Failed to clone repository. Neither 'main' nor 'master' branch is accessible. Please check if the repository exists and is public.`);
          }
        } else if (branch === 'master') {
          try {
            console.log(`Attempting to clone 'main' branch instead...`);
            await git.clone(url, targetPath, ['--branch', 'main', '--depth', '1']);
            clonedBranch = 'main';
            console.log(`Successfully cloned branch 'main'`);
          } catch (mainError) {
            throw new Error(`Failed to clone branch '${branch}'. Please check if the branch exists in the repository.`);
          }
        } else {
          throw new Error(`Failed to clone branch '${branch}'. Please check if the branch exists in the repository.`);
        }
      }
      
      // Switch to specific branch if different from default
      if (branch !== 'main' && branch !== 'master' && clonedBranch !== branch) {
        try {
          const repoGit = simpleGit(targetPath);
          await repoGit.checkout(branch);
          console.log(`Switched to branch '${branch}'`);
        } catch (checkoutError) {
          throw new Error(`Cloned branch '${clonedBranch}' but failed to switch to '${branch}'. The branch may not exist.`);
        }
      }

      // Verify the clone was successful
      const repoGit = simpleGit(targetPath);
      const status = await repoGit.status();
      console.log(`Repository cloned successfully. Current branch: ${status.current}`);
      await logger.logGitOperation('clone', url, true);
      
      return targetPath;
    } catch (error) {
      console.error('Error cloning repository:', error);
      
      // Clean up on failure
      try {
        await fs.rm(targetPath, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Error cleaning up failed clone:', cleanupError);
      }
      
      // Provide more helpful error messages
      if (error.message.includes('404')) {
        throw new Error('Repository not found. Please check if the URL is correct and the repository exists.');
      } else if (error.message.includes('403') || error.message.includes('401')) {
        throw new Error('Access denied. Please ensure the repository is public or you have the necessary permissions.');
      } else if (error.message.includes('resolve')) {
        throw new Error('Could not resolve the repository URL. Please check your internet connection and the URL.');
      } else {
        await logger.logGitOperation('clone', url, false, error);
        throw error;
      }
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
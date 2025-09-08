const fs = require('fs').promises;
const path = require('path');

class DirectoryScanner {
  constructor() {
    this.ignoredDirectories = new Set([
      'node_modules',
      '.git',
      '.idea',
      '.vscode',
      'dist',
      'build',
      'coverage',
      'venv',
      'env',
      '__pycache__',
      '.pytest_cache'
    ]);
    
    this.codeExtensions = new Set([
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
      '.php', '.rb', '.swift', '.kt', '.scala', '.clj', '.hs',
      '.sh', '.sql', '.html', '.css', '.scss', '.sass', '.less',
      '.vue', '.svelte', '.elm', '.dart', '.lua', '.r', '.m', '.mm'
    ]);
  }

  async scanDirectory(rootPath, knowledgeBaseId) {
    console.log(`Scanning directory: ${rootPath}`);
    
    const structure = [];
    await this.scanRecursive(rootPath, '', structure, knowledgeBaseId);
    
    console.log(`Found ${structure.length} items`);
    return structure;
  }

  async scanRecursive(currentPath, relativePath, structure, knowledgeBaseId, parentId = null) {
    try {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        const itemRelativePath = path.join(relativePath, item.name);
        
        // Skip ignored directories
        if (item.isDirectory() && this.ignoredDirectories.has(item.name)) {
          continue;
        }
        
        const type = item.isDirectory() ? 'directory' : 'file';
        
        // Create database record for this item
        const dbRecord = {
          knowledge_base_id: knowledgeBaseId,
          parent_id: parentId,
          name: item.name,
          type: type,
          path: itemRelativePath
        };
        
        structure.push(dbRecord);
        
        // For directories, recursively scan contents
        if (item.isDirectory()) {
          await this.scanRecursive(itemPath, itemRelativePath, structure, knowledgeBaseId, structure.length);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentPath}:`, error);
    }
  }

  filterCodeFiles(structure) {
    return structure
      .filter(item => item.type === 'file')
      .filter(item => {
        const ext = path.extname(item.name).toLowerCase();
        return this.codeExtensions.has(ext);
      })
      .slice(0, 20); // Limit to first 20 files for MVP
  }

  async getImportantFiles(structure) {
    const codeFiles = this.filterCodeFiles(structure);
    
    // Prioritize certain important files
    const priorityFiles = [
      'package.json', 'pom.xml', 'requirements.txt', 'Cargo.toml', 'go.mod',
      'README.md', 'README', 'LICENSE', 'index.js', 'main.js', 'app.js',
      'index.py', 'main.py', 'app.py', 'index.java', 'Main.java'
    ];
    
    const importantFiles = [];
    const otherFiles = [];
    
    for (const file of codeFiles) {
      const fileName = path.basename(file.name);
      if (priorityFiles.includes(fileName)) {
        importantFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    }
    
    // Sort by importance and return combined list
    return [...importantFiles, ...otherFiles].slice(0, 20);
  }

  async getFileContent(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  detectLanguage(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.go': 'Go',
      '.rs': 'Rust',
      '.c': 'C',
      '.cpp': 'C++',
      '.h': 'C/C++ Header',
      '.hpp': 'C++ Header',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.clj': 'Clojure',
      '.hs': 'Haskell',
      '.sh': 'Shell',
      '.sql': 'SQL',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
      '.less': 'Less',
      '.vue': 'Vue',
      '.svelte': 'Svelte',
      '.elm': 'Elm',
      '.dart': 'Dart',
      '.lua': 'Lua',
      '.r': 'R',
      '.m': 'Objective-C',
      '.mm': 'Objective-C++'
    };
    
    return languageMap[ext] || 'Unknown';
  }
}

module.exports = DirectoryScanner;
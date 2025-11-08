#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all TypeScript/JavaScript files
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (['node_modules', '.next', '.git', 'coverage'].includes(file)) {
      return;
    }
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Find empty catch blocks
function findEmptyCatchBlocks(content) {
  const patterns = [
    // Empty catch block: } catch (e) { }
    /catch\s*\([^)]*\)\s*{\s*}/g,
    // Catch with only comments
    /catch\s*\([^)]*\)\s*{\s*\/\/[^\n]*\s*}/g,
    // Catch with only console.log
    /catch\s*\(([^)]*)\)\s*{\s*console\.(log|error)\([^)]*\);\?\s*}/g,
  ];
  
  const matches = [];
  patterns.forEach((pattern, index) => {
    const found = [...content.matchAll(pattern)];
    found.forEach(match => {
      matches.push({
        match: match[0],
        index: match.index,
        type: index === 0 ? 'empty' : index === 1 ? 'comment-only' : 'console-only',
        variable: match[1] || 'error'
      });
    });
  });
  
  return matches;
}

// Fix empty catch blocks
function fixEmptyCatch(content, fileName) {
  let modified = content;
  const changes = [];
  
  // Find empty catch blocks
  const emptyCatches = findEmptyCatchBlocks(content);
  
  if (emptyCatches.length === 0) {
    return { modified, hasChanges: false, changes };
  }
  
  // Sort by index (descending) to replace from end to start
  emptyCatches.sort((a, b) => b.index - a.index);
  
  emptyCatches.forEach(({ match, index, type, variable }) => {
    let replacement;
    
    if (type === 'empty') {
      // Replace with error handler
      replacement = `catch (${variable}) {
      ErrorHandler.handle(${variable}, '${path.basename(fileName, path.extname(fileName))}');
    }`;
    } else if (type === 'comment-only') {
      // Replace with error handler
      replacement = `catch (${variable}) {
      // TODO: Implement proper error handling
      ErrorHandler.handle(${variable}, '${path.basename(fileName, path.extname(fileName))}');
    }`;
    } else {
      // Replace console.log with proper logging
      replacement = `catch (${variable}) {
      logger.error('Error occurred', ${variable});
      ErrorHandler.handle(${variable}, '${path.basename(fileName, path.extname(fileName))}');
    }`;
    }
    
    modified = modified.slice(0, index) + replacement + modified.slice(index + match.length);
    changes.push(`  - Fixed ${type} catch block`);
  });
  
  // Add imports if needed
  if (changes.length > 0) {
    // Check if ErrorHandler is imported
    if (!modified.includes('ErrorHandler') || !modified.includes('import')) {
      if (fileName.match(/\.(ts|tsx)$/)) {
        // Add import at the beginning
        const importStatement = "import { ErrorHandler } from '@/lib/utils/errorHandler';\n";
        if (!modified.includes(importStatement)) {
          // Find the last import
          const lastImportMatch = modified.match(/(import[^;]+;)(?![\s\S]*import)/);
          if (lastImportMatch) {
            const insertIndex = modified.indexOf(lastImportMatch[0]) + lastImportMatch[0].length;
            modified = modified.slice(0, insertIndex) + '\n' + importStatement + modified.slice(insertIndex);
          } else {
            modified = importStatement + '\n' + modified;
          }
        }
      }
    }
    
    // Add logger import if needed
    if (modified.includes('logger.') && !modified.includes("import logger")) {
      const loggerImport = "import logger from '@/lib/utils/logger';\n";
      if (!modified.includes(loggerImport)) {
        modified = loggerImport + modified;
      }
    }
  }
  
  return { modified, hasChanges: changes.length > 0, changes };
}

// Main function
function fixAllEmptyCatches() {
  const projectDir = path.join(__dirname, '..');
  const files = getAllFiles(projectDir);
  
  console.log(`🔍 Scanning ${files.length} files for empty catch blocks...\n`);
  
  let totalEmptyCatches = 0;
  let filesModified = 0;
  const modifiedFiles = [];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const { modified, hasChanges, changes } = fixEmptyCatch(content, file);
    
    if (hasChanges) {
      const relativePath = path.relative(projectDir, file);
      
      if (process.argv.includes('--dry-run')) {
        console.log(`📄 ${relativePath}:`);
        changes.forEach(change => console.log(change));
        console.log('');
      } else {
        fs.writeFileSync(file, modified);
        modifiedFiles.push(relativePath);
      }
      
      filesModified++;
      totalEmptyCatches += changes.length;
    }
  });
  
  console.log('📊 Summary:');
  console.log(`   - Files scanned: ${files.length}`);
  console.log(`   - Files with empty catches: ${filesModified}`);
  console.log(`   - Total empty catch blocks found: ${totalEmptyCatches}`);
  
  if (process.argv.includes('--dry-run')) {
    console.log('\n⚠️  Dry run mode - no files were modified');
    console.log('Run without --dry-run to apply changes');
  } else if (filesModified > 0) {
    console.log('\n✅ Empty catch blocks fixed!');
    console.log('\n📝 Modified files:');
    modifiedFiles.forEach(file => console.log(`   - ${file}`));
  } else {
    console.log('\n✨ No empty catch blocks found!');
  }
}

// Run script
if (require.main === module) {
  fixAllEmptyCatches();
}
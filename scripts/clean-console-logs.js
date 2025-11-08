#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Dizinleri recursive olarak tara
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Ignore node_modules, .next, .git
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

// Console.log'ları logger ile değiştir
function replaceConsoleLogs(content, fileName) {
  let modified = content;
  let hasLogger = false;
  const changes = [];
  
  // console.log patterns
  const patterns = [
    { pattern: /console\.log\s*\((.*?)\)/g, replacement: 'logger.debug($1)', type: 'debug' },
    { pattern: /console\.info\s*\((.*?)\)/g, replacement: 'logger.info($1)', type: 'info' },
    { pattern: /console\.warn\s*\((.*?)\)/g, replacement: 'logger.warn($1)', type: 'warn' },
    { pattern: /console\.error\s*\((.*?)\)/g, replacement: 'logger.error($1)', type: 'error' },
  ];
  
  patterns.forEach(({ pattern, replacement, type }) => {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      hasLogger = true;
      changes.push(`  - ${matches.length} console.${type === 'debug' ? 'log' : type} → logger.${type}`);
      modified = modified.replace(pattern, replacement);
    }
  });
  
  // Logger import ekle
  if (hasLogger && !modified.includes('import logger')) {
    // TypeScript/JSX files
    if (fileName.match(/\.(ts|tsx)$/)) {
      if (modified.includes('import')) {
        // Diğer import'lardan sonra ekle
        modified = modified.replace(
          /(import[\s\S]*?from\s+['"][^'"]+['"];?)\n/,
          "$1\nimport logger from '@/lib/utils/logger';\n"
        );
      } else {
        // Dosyanın başına ekle
        modified = "import logger from '@/lib/utils/logger';\n\n" + modified;
      }
    }
  }
  
  return { modified, hasLogger, changes };
}

// Ana fonksiyon
function cleanConsoleLogs() {
  const projectDir = path.join(__dirname, '..');
  const files = getAllFiles(projectDir);
  
  console.log(`🔍 Scanning ${files.length} files for console.log statements...\n`);
  
  let totalConsoleLogsFound = 0;
  let filesModified = 0;
  const modifiedFiles = [];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const { modified, hasLogger, changes } = replaceConsoleLogs(content, file);
    
    if (hasLogger) {
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
      totalConsoleLogsFound += changes.length;
    }
  });
  
  console.log('📊 Summary:');
  console.log(`   - Files scanned: ${files.length}`);
  console.log(`   - Files with console.log: ${filesModified}`);
  console.log(`   - Total console statements found: ${totalConsoleLogsFound}`);
  
  if (process.argv.includes('--dry-run')) {
    console.log('\n⚠️  Dry run mode - no files were modified');
    console.log('Run without --dry-run to apply changes');
  } else if (filesModified > 0) {
    console.log('\n✅ Console.log statements replaced with logger!');
    console.log('\n📝 Modified files:');
    modifiedFiles.forEach(file => console.log(`   - ${file}`));
  } else {
    console.log('\n✨ No console.log statements found!');
  }
}

// Script'i çalıştır
if (require.main === module) {
  cleanConsoleLogs();
}
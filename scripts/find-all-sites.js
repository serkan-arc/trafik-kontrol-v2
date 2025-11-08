#!/usr/bin/env node

/**
 * Find All Site Projects on Server
 * Scans the entire server for potential website projects
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to identify website projects
const SITE_INDICATORS = {
  // Config files
  configs: ['package.json', 'next.config.js', 'next.config.ts', 'vite.config.js', 'webpack.config.js'],
  
  // HTML files
  html: ['index.html', 'home.html', 'main.html'],
  
  // Framework indicators
  frameworks: {
    nextjs: ['next.config.js', 'next.config.ts', '.next'],
    react: ['package.json'], // will check for react in dependencies
    vue: ['vue.config.js', 'nuxt.config.js'],
    static: ['index.html']
  }
};

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.npm',
  '.yarn',
  'vendor',
  'bower_components',
  '__pycache__',
  '.vscode',
  '.idea'
];

// Root directories to search
const SEARCH_ROOTS = [
  '/root',
  '/home',
  '/var/www',
  '/opt',
  '/usr/local'
];

const foundSites = [];

// Function to check if directory is a website project
function isWebProject(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    
    // Check for config files
    for (const config of SITE_INDICATORS.configs) {
      if (files.includes(config)) {
        return { type: detectProjectType(dirPath, files), confidence: 'high' };
      }
    }
    
    // Check for HTML files
    for (const html of SITE_INDICATORS.html) {
      if (files.includes(html)) {
        return { type: 'static', confidence: 'medium' };
      }
    }
    
    // Check for public/src directories
    if (files.includes('public') || files.includes('src')) {
      const hasWeb = checkForWebContent(dirPath);
      if (hasWeb) {
        return { type: 'unknown', confidence: 'low' };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Detect project type
function detectProjectType(dirPath, files) {
  // Check for Next.js
  if (files.includes('next.config.js') || files.includes('next.config.ts')) {
    return 'nextjs';
  }
  
  // Check package.json for framework
  if (files.includes('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dirPath, 'package.json'), 'utf8'));
      
      if (pkg.dependencies) {
        if (pkg.dependencies.next) return 'nextjs';
        if (pkg.dependencies.react || pkg.dependencies['react-dom']) return 'react';
        if (pkg.dependencies.vue) return 'vue';
        if (pkg.dependencies.express) return 'express';
        if (pkg.dependencies.fastify) return 'fastify';
      }
      
      // Check scripts for hints
      if (pkg.scripts) {
        if (pkg.scripts.dev?.includes('next') || pkg.scripts.build?.includes('next')) return 'nextjs';
        if (pkg.scripts.dev?.includes('vite') || pkg.scripts.build?.includes('vite')) return 'vite';
        if (pkg.scripts.start?.includes('node')) return 'nodejs';
      }
      
      return 'nodejs';
    } catch (error) {
      // Ignore parse errors
    }
  }
  
  // Check for static site
  if (files.includes('index.html')) {
    return 'static';
  }
  
  return 'unknown';
}

// Check for web content
function checkForWebContent(dirPath) {
  try {
    const publicPath = path.join(dirPath, 'public');
    const srcPath = path.join(dirPath, 'src');
    
    if (fs.existsSync(publicPath)) {
      const publicFiles = fs.readdirSync(publicPath);
      if (publicFiles.some(f => f.endsWith('.html') || f.endsWith('.css') || f.endsWith('.js'))) {
        return true;
      }
    }
    
    if (fs.existsSync(srcPath)) {
      const srcFiles = fs.readdirSync(srcPath);
      if (srcFiles.some(f => f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.vue'))) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// Get project info
function getProjectInfo(dirPath) {
  const stats = fs.statSync(dirPath);
  let name = path.basename(dirPath);
  let version = 'unknown';
  let description = '';
  let dependencies = [];
  let lastModified = stats.mtime;
  let size = 0;
  
  // Try to get size
  try {
    const sizeOutput = execSync(`du -sh "${dirPath}" 2>/dev/null | cut -f1`, { encoding: 'utf8' });
    size = sizeOutput.trim();
  } catch (error) {
    size = 'unknown';
  }
  
  // Try to read package.json
  const pkgPath = path.join(dirPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      name = pkg.name || name;
      version = pkg.version || version;
      description = pkg.description || description;
      dependencies = Object.keys(pkg.dependencies || {});
    } catch (error) {
      // Ignore
    }
  }
  
  // Check for git info
  let gitInfo = null;
  const gitPath = path.join(dirPath, '.git');
  if (fs.existsSync(gitPath)) {
    try {
      const branch = execSync(`cd "${dirPath}" && git branch --show-current 2>/dev/null`, { encoding: 'utf8' }).trim();
      const lastCommit = execSync(`cd "${dirPath}" && git log -1 --format="%h %s" 2>/dev/null`, { encoding: 'utf8' }).trim();
      gitInfo = { branch, lastCommit };
    } catch (error) {
      // Ignore
    }
  }
  
  return {
    name,
    version,
    description,
    dependencies: dependencies.slice(0, 5), // Just first 5
    lastModified,
    size,
    gitInfo
  };
}

// Recursive directory scanner
function scanDirectory(dirPath, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      // Skip certain directories
      if (SKIP_DIRS.includes(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.next') continue;
      
      const fullPath = path.join(dirPath, entry.name);
      
      // Check if this is a web project
      const projectType = isWebProject(fullPath);
      if (projectType) {
        const info = getProjectInfo(fullPath);
        foundSites.push({
          path: fullPath,
          type: projectType.type,
          confidence: projectType.confidence,
          ...info
        });
        
        // Don't scan inside found projects
        continue;
      }
      
      // Recursively scan subdirectories
      scanDirectory(fullPath, depth + 1, maxDepth);
    }
  } catch (error) {
    // Ignore permission errors
  }
}

// Main function
async function findAllSites() {
  console.log('🔍 Starting comprehensive site search...\n');
  console.log('📁 Searching in:', SEARCH_ROOTS.join(', '));
  console.log('⏳ This may take a few minutes...\n');
  
  // Scan each root directory
  for (const root of SEARCH_ROOTS) {
    if (fs.existsSync(root)) {
      console.log(`\n🔎 Scanning ${root}...`);
      scanDirectory(root);
    }
  }
  
  // Sort by last modified date
  foundSites.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  
  console.log('\n' + '='.repeat(80));
  console.log(`📊 SCAN COMPLETE - Found ${foundSites.length} potential sites`);
  console.log('='.repeat(80) + '\n');
  
  // Group by type
  const byType = {};
  foundSites.forEach(site => {
    if (!byType[site.type]) byType[site.type] = [];
    byType[site.type].push(site);
  });
  
  // Display results by type
  for (const [type, sites] of Object.entries(byType)) {
    console.log(`\n📦 ${type.toUpperCase()} Projects (${sites.length}):`);
    console.log('-'.repeat(60));
    
    sites.forEach((site, index) => {
      console.log(`\n${index + 1}. ${site.name} (v${site.version})`);
      console.log(`   📂 Path: ${site.path}`);
      console.log(`   📏 Size: ${site.size}`);
      console.log(`   📅 Modified: ${new Date(site.lastModified).toLocaleDateString()}`);
      console.log(`   🎯 Confidence: ${site.confidence}`);
      
      if (site.description) {
        console.log(`   📝 Description: ${site.description}`);
      }
      
      if (site.dependencies.length > 0) {
        console.log(`   📦 Dependencies: ${site.dependencies.join(', ')}`);
      }
      
      if (site.gitInfo) {
        console.log(`   🔀 Git: ${site.gitInfo.branch} - ${site.gitInfo.lastCommit}`);
      }
    });
  }
  
  // Save results to JSON file
  const resultsPath = '/home/root/webapp/traffic-control-system/found-sites.json';
  fs.writeFileSync(resultsPath, JSON.stringify(foundSites, null, 2));
  
  console.log('\n' + '='.repeat(80));
  console.log('💾 Results saved to: found-sites.json');
  console.log('='.repeat(80));
  
  // Summary
  console.log('\n📈 SUMMARY:');
  console.log(`   Total sites found: ${foundSites.length}`);
  console.log(`   High confidence: ${foundSites.filter(s => s.confidence === 'high').length}`);
  console.log(`   Medium confidence: ${foundSites.filter(s => s.confidence === 'medium').length}`);
  console.log(`   Low confidence: ${foundSites.filter(s => s.confidence === 'low').length}`);
  
  console.log('\n✨ Next steps:');
  console.log('   1. Review found-sites.json');
  console.log('   2. Test each site with test-site.js');
  console.log('   3. Move working sites to /sites directory');
  console.log('   4. Clean up non-working duplicates');
}

// Run
findAllSites().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
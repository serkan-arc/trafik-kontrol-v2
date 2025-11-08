import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedPath = searchParams.get('path');
    // Changed to scan trafik-manager-siteler directory for deployed sites only
    const baseDir = '/home/root/trafik-manager-siteler';
    
    // If a specific path is requested, scan it recursively
    if (requestedPath) {
      const fullPath = path.join(baseDir, requestedPath);
      
      // Security check: ensure path is within baseDir
      if (!fullPath.startsWith(baseDir)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid path',
        }, { status: 400 });
      }
      
      const folders = scanFoldersRecursive(fullPath, requestedPath, baseDir, 3);
      
      return NextResponse.json({
        success: true,
        folders,
        baseDir,
        currentPath: requestedPath,
      });
    }
    
    // Otherwise, scan all folders recursively (up to 3 levels deep)
    const allFolders: any[] = [];
    
    // Check if sites directory exists, if not create it
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      // Also create category directories
      const categories = ['static', 'nextjs', 'nodejs', 'react', 'archives'];
      for (const cat of categories) {
        const catPath = path.join(baseDir, cat);
        if (!fs.existsSync(catPath)) {
          fs.mkdirSync(catPath, { recursive: true });
        }
      }
    }
    
    // Scan base directory
    const items = fs.readdirSync(baseDir, { withFileTypes: true });
    
    for (const item of items) {
      if (!item.isDirectory()) continue;
      if (item.name.startsWith('.')) continue; // Skip hidden folders
      if (item.name === 'node_modules') continue;
      if (item.name === 'to-remove') continue; // Skip removal candidates
      
      const folderPath = path.join(baseDir, item.name);
      
      // Only scan the first level for trafik-manager-siteler
      // Don't go into subdirectories
      const folders = scanFoldersRecursive(folderPath, item.name, baseDir, 0);
      allFolders.push(...folders);
    }
    
    // Sort by modified date (most recent first)
    allFolders.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    return NextResponse.json({
      success: true,
      folders: allFolders,
      baseDir,
    });
  } catch (error: any) {
    console.error('Error listing local folders:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// Recursive folder scanner
function scanFoldersRecursive(
  folderPath: string, 
  displayName: string, 
  baseDir: string, 
  maxDepth: number,
  currentDepth: number = 0
): any[] {
  const results: any[] = [];
  
  if (currentDepth > maxDepth) {
    return results;
  }
  
  try {
    // Analyze current folder
    const folderInfo = analyzeFolder(folderPath, displayName, baseDir);
    if (folderInfo) {
      // Mark if folder has subdirectories
      folderInfo.hasSubfolders = hasSubdirectories(folderPath);
      results.push(folderInfo);
    }
    
    // Scan subdirectories
    try {
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory()) continue;
        if (item.name.startsWith('.')) continue;
        if (item.name === 'node_modules') continue;
        if (item.name === '.next') continue;
        if (item.name === 'build') continue;
        if (item.name === 'dist') continue;
        
        const subPath = path.join(folderPath, item.name);
        const subDisplayName = `${displayName}/${item.name}`;
        
        const subFolders = scanFoldersRecursive(
          subPath, 
          subDisplayName, 
          baseDir, 
          maxDepth, 
          currentDepth + 1
        );
        results.push(...subFolders);
      }
    } catch (e) {
      // Skip if can't read subdirectories
    }
  } catch (e) {
    // Skip if can't analyze folder
  }
  
  return results;
}

// Check if folder has subdirectories
function hasSubdirectories(folderPath: string): boolean {
  try {
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    return items.some(item => 
      item.isDirectory() && 
      !item.name.startsWith('.') && 
      item.name !== 'node_modules'
    );
  } catch (e) {
    return false;
  }
}

// Helper function to analyze a folder
function analyzeFolder(folderPath: string, displayName: string, baseDir: string): any | null {
  try {
    const stats = fs.statSync(folderPath);
    
    // Detect project type
    let projectType = 'unknown';
    let hasPackageJson = false;
    let packageInfo: any = null;
    let hasIndexHtml = false;
    let isDeployable = false;
    
    try {
      const packageJsonPath = path.join(folderPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        hasPackageJson = true;
        isDeployable = true;
        const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
        packageInfo = JSON.parse(packageContent);
        
        // Detect framework
        if (packageInfo.dependencies?.next || packageInfo.devDependencies?.next) {
          projectType = 'nextjs';
        } else if (packageInfo.dependencies?.react || packageInfo.devDependencies?.react) {
          projectType = 'react';
        } else if (packageInfo.dependencies?.express) {
          projectType = 'express';
        } else if (packageInfo.name) {
          projectType = 'nodejs';
        }
      }
      
      // Check for index.html (static site)
      const indexPath = path.join(folderPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        hasIndexHtml = true;
        isDeployable = true;
        if (projectType === 'unknown') {
          projectType = 'static';
        }
      }
      
      // Check if it's a folder with HTML files
      if (!isDeployable) {
        const files = fs.readdirSync(folderPath);
        const hasHtmlFiles = files.some(f => f.endsWith('.html'));
        if (hasHtmlFiles) {
          projectType = 'static';
          isDeployable = true;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    // Return all folders (even non-deployable ones) so user can browse
    // Mark them as deployable or not
    return {
      name: displayName,
      path: folderPath,
      type: projectType,
      size: getDirectorySize(folderPath),
      modified: stats.mtime,
      hasPackageJson,
      hasIndexHtml,
      isDeployable,
      packageName: packageInfo?.name || displayName,
      version: packageInfo?.version || '1.0.0',
    };
  } catch (e) {
    return null;
  }
}

// Helper function to get directory size (in MB)
function getDirectorySize(dirPath: string): string {
  try {
    const output = execSync(`du -sh "${dirPath}" 2>/dev/null | awk '{print $1}'`, {
      encoding: 'utf-8'
    }).trim();
    return output || '?';
  } catch (e) {
    return '?';
  }
}

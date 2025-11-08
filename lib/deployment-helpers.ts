// Smart Deployment Helpers
// Auto-detect project configuration and handle deployment intelligently

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

export interface ProjectConfig {
  isNextJs: boolean;
  isStaticExport: boolean;
  hasOutDir: boolean;
  hasBuild: boolean;
  startCommand: string;
  needsBuild: boolean;
}

/**
 * Detect if project uses static export mode
 */
export async function detectStaticExport(projectPath: string): Promise<boolean> {
  try {
    // Check for next.config.mjs
    const mjsPath = path.join(projectPath, 'next.config.mjs');
    if (await exists(mjsPath)) {
      const content = await readFile(mjsPath, 'utf-8');
      if (content.includes("output: 'export'") || content.includes('output:"export"')) {
        return true;
      }
    }

    // Check for next.config.js
    const jsPath = path.join(projectPath, 'next.config.js');
    if (await exists(jsPath)) {
      const content = await readFile(jsPath, 'utf-8');
      if (content.includes("output: 'export'") || content.includes('output:"export"')) {
        return true;
      }
    }

    // Check for next.config.ts
    const tsPath = path.join(projectPath, 'next.config.ts');
    if (await exists(tsPath)) {
      const content = await readFile(tsPath, 'utf-8');
      if (content.includes("output: 'export'") || content.includes('output:"export"')) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error detecting static export:', error);
    return false;
  }
}

/**
 * Analyze project and determine deployment configuration
 */
export async function analyzeProject(projectPath: string): Promise<ProjectConfig> {
  const config: ProjectConfig = {
    isNextJs: false,
    isStaticExport: false,
    hasOutDir: false,
    hasBuild: false,
    startCommand: 'npm start',
    needsBuild: false,
  };

  try {
    // Check if Next.js project
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await exists(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      config.isNextJs = !!(packageJson.dependencies?.next || packageJson.devDependencies?.next);
    }

    if (config.isNextJs) {
      // Check for static export
      config.isStaticExport = await detectStaticExport(projectPath);

      // Check if out directory exists (for static export)
      const outPath = path.join(projectPath, 'out');
      config.hasOutDir = await exists(outPath);

      // Check if .next build exists
      const buildPath = path.join(projectPath, '.next', 'BUILD_ID');
      config.hasBuild = await exists(buildPath);

      // Determine start command
      if (config.isStaticExport) {
        if (config.hasOutDir) {
          config.startCommand = 'npx serve@latest out -l {PORT}';
        } else {
          config.needsBuild = true;
          config.startCommand = 'npx serve@latest out -l {PORT}';
        }
      } else {
        if (!config.hasBuild) {
          config.needsBuild = true;
        }
        config.startCommand = 'npm start';
      }
    }

    return config;
  } catch (error) {
    console.error('Error analyzing project:', error);
    return config;
  }
}

/**
 * Generate PM2 start command based on project configuration
 */
export function generatePM2Command(
  projectPath: string,
  projectName: string,
  port: number,
  config: ProjectConfig
): string {
  if (config.isStaticExport) {
    // For static exports, use serve
    return `cd "${projectPath}" && pm2 start "npx" --name "${projectName}" -- serve@latest out -l ${port}`;
  } else {
    // For server mode, use npm start with PORT env
    return `cd "${projectPath}" && PORT=${port} pm2 start "npm" --name "${projectName}" -- start`;
  }
}

/**
 * Check if port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(`lsof -i :${port} | grep LISTEN`);
    return stdout.trim().length === 0;
  } catch (error) {
    // If lsof returns error, port is likely available
    return true;
  }
}

/**
 * Find next available port starting from given port
 */
export async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Build Next.js project if needed
 */
export async function buildProjectIfNeeded(projectPath: string, config: ProjectConfig): Promise<{
  success: boolean;
  message: string;
}> {
  if (!config.needsBuild) {
    return { success: true, message: 'Build not needed' };
  }

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log(`Building project at ${projectPath}...`);
    const { stdout, stderr } = await execAsync(`cd "${projectPath}" && npm run build`, {
      timeout: 300000, // 5 minutes timeout
    });
    
    console.log('Build stdout:', stdout);
    if (stderr) console.log('Build stderr:', stderr);

    return { success: true, message: 'Build completed successfully' };
  } catch (error: any) {
    console.error('Build error:', error);
    return { success: false, message: `Build failed: ${error.message}` };
  }
}

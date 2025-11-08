// Station 2: Site Upload API
// Handle file uploads for site deployment

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

const UPLOAD_BASE_PATH = '/home/root/webapp/deployed-sites';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * POST /api/sites/upload
 * Upload and extract site files (zip archives)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const siteName = formData.get('siteName') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided'
        },
        { status: 400 }
      );
    }

    if (!siteName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Site name is required'
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        },
        { status: 413 }
      );
    }

    // Validate file type (only zip files)
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only ZIP files are allowed'
        },
        { status: 400 }
      );
    }

    // Create unique directory for this site
    const sanitizedSiteName = siteName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const uniqueId = randomBytes(4).toString('hex');
    const siteDir = path.join(UPLOAD_BASE_PATH, `${sanitizedSiteName}-${uniqueId}`);
    const zipPath = path.join(siteDir, 'upload.zip');

    // Ensure base upload directory exists
    await mkdir(UPLOAD_BASE_PATH, { recursive: true });

    // Create site directory
    await mkdir(siteDir, { recursive: true });

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(zipPath, buffer);

    // Extract zip file
    try {
      await execAsync(`cd "${siteDir}" && unzip -q upload.zip`);
      
      // Remove zip file after extraction
      await execAsync(`rm "${zipPath}"`);

      // Find the main directory or index.html
      const { stdout: lsOutput } = await execAsync(`ls -1 "${siteDir}"`);
      const files = lsOutput.trim().split('\n');

      // If there's only one directory, use it as the root
      let actualPath = siteDir;
      if (files.length === 1) {
        const singleItem = path.join(siteDir, files[0]);
        const { stdout: statOutput } = await execAsync(`stat -c %F "${singleItem}"`);
        if (statOutput.trim() === 'directory') {
          actualPath = singleItem;
        }
      }

      // Detect site type
      const siteType = await detectSiteType(actualPath);

      // Get directory size
      const { stdout: sizeOutput } = await execAsync(`du -sh "${actualPath}" | cut -f1`);
      const size = sizeOutput.trim();

      return NextResponse.json({
        success: true,
        message: 'File uploaded and extracted successfully',
        data: {
          siteName: sanitizedSiteName,
          filePath: actualPath,
          siteType,
          size,
          files: files.length
        }
      });

    } catch (extractError: any) {
      // Clean up on extraction failure
      await execAsync(`rm -rf "${siteDir}"`).catch(() => {});
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to extract ZIP file',
          message: extractError.message
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload file',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Detect site type based on file structure
 */
async function detectSiteType(dirPath: string): Promise<'static' | 'nodejs' | 'nextjs' | 'react'> {
  try {
    const { stdout } = await execAsync(`ls -1 "${dirPath}"`);
    const files = stdout.trim().split('\n');

    // Check for Next.js
    if (files.includes('next.config.js') || files.includes('next.config.mjs') || files.includes('next.config.ts')) {
      return 'nextjs';
    }

    // Check for Node.js (package.json + node_modules or server.js)
    if (files.includes('package.json')) {
      const { stdout: packageContent } = await execAsync(`cat "${path.join(dirPath, 'package.json')}"`);
      const packageJson = JSON.parse(packageContent);
      
      // Check if it's a React app
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        return 'react';
      }
      
      // Otherwise it's a generic Node.js app
      return 'nodejs';
    }

    // Check for server.js or app.js (Node.js)
    if (files.includes('server.js') || files.includes('app.js') || files.includes('index.js')) {
      return 'nodejs';
    }

    // Default to static site
    return 'static';
  } catch {
    return 'static';
  }
}

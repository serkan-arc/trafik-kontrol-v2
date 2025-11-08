// Individual Nginx Site Management API
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

interface RouteContext {
  params: Promise<{ site: string }>;
}

/**
 * GET /api/nginx/[site]
 * Get specific nginx configuration content
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { site } = await context.params;
    const configPath = `/etc/nginx/sites-available/${site}`;
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 });
    }
    
    const content = await readFileAsync(configPath, 'utf-8');
    const stats = fs.statSync(configPath);
    
    // Check if enabled
    const enabledPath = `/etc/nginx/sites-enabled/${site}`;
    const enabled = fs.existsSync(enabledPath);
    
    return NextResponse.json({
      success: true,
      site,
      content,
      enabled,
      stats: {
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error fetching nginx config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch nginx configuration',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * PATCH /api/nginx/[site]
 * Update nginx configuration
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { site } = await context.params;
    const body = await request.json();
    const { content, action } = body;
    
    const availablePath = `/etc/nginx/sites-available/${site}`;
    const enabledPath = `/etc/nginx/sites-enabled/${site}`;
    
    if (!fs.existsSync(availablePath)) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 });
    }
    
    // Handle different actions
    if (action === 'enable') {
      // Enable site
      if (!fs.existsSync(enabledPath)) {
        await execAsync(`ln -s ${availablePath} ${enabledPath}`);
      }
      
      // Test and reload nginx
      await execAsync('sudo nginx -t');
      await execAsync('sudo systemctl reload nginx');
      
      return NextResponse.json({
        success: true,
        message: 'Site enabled successfully'
      });
      
    } else if (action === 'disable') {
      // Disable site
      if (fs.existsSync(enabledPath)) {
        fs.unlinkSync(enabledPath);
      }
      
      // Test and reload nginx
      await execAsync('sudo nginx -t');
      await execAsync('sudo systemctl reload nginx');
      
      return NextResponse.json({
        success: true,
        message: 'Site disabled successfully'
      });
      
    } else if (content) {
      // Update content
      // Backup current config
      const backupPath = `${availablePath}.backup.${Date.now()}`;
      const currentContent = await readFileAsync(availablePath, 'utf-8');
      await writeFileAsync(backupPath, currentContent, 'utf-8');
      
      // Write new content
      await writeFileAsync(availablePath, content, 'utf-8');
      
      // Test configuration
      try {
        await execAsync('nginx -t');
        
        // If test passes, reload nginx
        await execAsync('systemctl reload nginx');
        
        // Clean old backup (keep last 5)
        const backups = fs.readdirSync(path.dirname(availablePath))
          .filter(f => f.startsWith(`${site}.backup.`))
          .sort()
          .reverse();
        
        if (backups.length > 5) {
          backups.slice(5).forEach(backup => {
            fs.unlinkSync(path.join(path.dirname(availablePath), backup));
          });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Configuration updated successfully',
          backup: backupPath
        });
        
      } catch (error: any) {
        // Restore backup if test fails
        await writeFileAsync(availablePath, currentContent, 'utf-8');
        fs.unlinkSync(backupPath);
        
        return NextResponse.json({
          success: false,
          error: 'Invalid nginx configuration',
          message: error.message
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'No action specified'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Error updating nginx config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update nginx configuration',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/nginx/[site]
 * Delete nginx configuration
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { site } = await context.params;
    
    const availablePath = `/etc/nginx/sites-available/${site}`;
    const enabledPath = `/etc/nginx/sites-enabled/${site}`;
    
    if (!fs.existsSync(availablePath)) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 });
    }
    
    // Create backup before deletion
    const backupPath = `/etc/nginx/sites-available/.deleted/${site}.${Date.now()}`;
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const content = await readFileAsync(availablePath, 'utf-8');
    await writeFileAsync(backupPath, content, 'utf-8');
    
    // Remove enabled symlink if exists
    if (fs.existsSync(enabledPath)) {
      fs.unlinkSync(enabledPath);
    }
    
    // Remove config file
    fs.unlinkSync(availablePath);
    
    // Test and reload nginx
    await execAsync('sudo nginx -t');
    await execAsync('sudo systemctl reload nginx');
    
    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
      backup: backupPath
    });
    
  } catch (error: any) {
    console.error('Error deleting nginx config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete nginx configuration',
      message: error.message
    }, { status: 500 });
  }
}
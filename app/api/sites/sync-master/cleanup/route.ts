/**
 * Sync Cleanup API
 * 
 * POST /api/sites/sync-master/cleanup - Delete orphan resource
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { db } from '@/lib/db';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, message: 'name ve type parametreleri gerekli' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Cleanup: ${name} (${type})`);

    let deleted = false;
    let message = '';

    switch (type) {
      case 'pm2':
        // Delete PM2 process
        try {
          await execAsync(`pm2 delete ${name}`);
          await execAsync('pm2 save');
          deleted = true;
          message = `PM2 process "${name}" silindi`;
          console.log(`✅ ${message}`);
        } catch (error: any) {
          console.error('PM2 delete error:', error);
          return NextResponse.json(
            { success: false, message: `PM2 process silinemedi: ${error.message}` },
            { status: 500 }
          );
        }
        break;

      case 'nginx':
        // Delete Nginx config
        try {
          const configPath = `/etc/nginx/sites-available/${name}`;
          const enabledPath = `/etc/nginx/sites-enabled/${name}`;
          
          // Remove symlink
          try {
            await fs.unlink(enabledPath);
          } catch (e) {
            // Symlink might not exist
          }
          
          // Remove config file
          await fs.unlink(configPath);
          
          // Test and reload nginx
          const { stdout } = await execAsync('nginx -t 2>&1');
          if (stdout.includes('syntax is ok')) {
            await execAsync('systemctl reload nginx');
          }
          
          deleted = true;
          message = `Nginx config "${name}" silindi`;
          console.log(`✅ ${message}`);
        } catch (error: any) {
          console.error('Nginx delete error:', error);
          return NextResponse.json(
            { success: false, message: `Nginx config silinemedi: ${error.message}` },
            { status: 500 }
          );
        }
        break;

      case 'database':
        // Delete from database
        try {
          await db.query(
            'DELETE FROM deployed_sites WHERE name = $1',
            [name]
          );
          deleted = true;
          message = `Database kaydı "${name}" silindi`;
          console.log(`✅ ${message}`);
        } catch (error: any) {
          console.error('Database delete error:', error);
          return NextResponse.json(
            { success: false, message: `Database kaydı silinemedi: ${error.message}` },
            { status: 500 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { success: false, message: `Geçersiz tip: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        name,
        type,
        deleted
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}

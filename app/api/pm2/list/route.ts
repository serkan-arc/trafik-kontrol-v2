// API: List all PM2 processes
import { NextRequest, NextResponse } from 'next/server';
import { PM2Manager } from '@/lib/pm2-manager';

export async function GET(request: NextRequest) {
  try {
    const processes = await PM2Manager.listProcesses();
    
    return NextResponse.json({
      success: true,
      processes,
      total: processes.length
    });
  } catch (error: any) {
    console.error('Error listing PM2 processes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list processes',
        message: error.message
      },
      { status: 500 }
    );
  }
}

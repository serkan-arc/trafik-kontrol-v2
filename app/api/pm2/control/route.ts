// API: Control PM2 processes (restart, stop, delete)
import { NextRequest, NextResponse } from 'next/server';
import { PM2Manager } from '@/lib/pm2-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processName, action } = body;

    if (!processName || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: processName, action'
        },
        { status: 400 }
      );
    }

    if (!['restart', 'stop', 'delete'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be one of: restart, stop, delete'
        },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'restart':
        result = await PM2Manager.restart(processName);
        break;
      case 'stop':
        result = await PM2Manager.stop(processName);
        break;
      case 'delete':
        result = await PM2Manager.delete(processName);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action'
          },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error controlling PM2 process:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to control process',
        message: error.message
      },
      { status: 500 }
    );
  }
}

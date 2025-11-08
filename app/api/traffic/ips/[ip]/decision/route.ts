/**
 * IP Tracking API - Admin Manual Decision
 * 
 * POST /api/traffic/ips/:ip/decision
 * 
 * Body:
 * {
 *   "decision": "whitelist" | "graylist" | "blacklist",
 *   "redirect_version": "clean" | "gray" | "aggressive",
 *   "notes": "string"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateIPStatus } from '@/lib/traffic/ip-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {
    const body = await request.json();

    const { decision, redirect_version, notes } = body;

    // Validate input
    if (!decision || !['whitelist', 'graylist', 'blacklist'].includes(decision)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid decision. Must be: whitelist, graylist, or blacklist'
      }, { status: 400 });
    }

    if (!redirect_version || !['clean', 'gray', 'aggressive'].includes(redirect_version)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid redirect_version. Must be: clean, gray, or aggressive'
      }, { status: 400 });
    }

    // Update IP status
    await updateIPStatus(
      ip,
      decision,
      redirect_version,
      'admin-user-id', // TODO: Get from auth session
      notes
    );

    return NextResponse.json({
      success: true,
      message: `IP ${ip} has been added to ${decision}`,
      data: {
        ip,
        status: decision,
        redirect_version,
        notes
      }
    });

  } catch (error: any) {
    console.error(`Error in POST /api/traffic/ips/${ip}/decision:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update IP decision',
      message: error.message
    }, { status: 500 });
  }
}

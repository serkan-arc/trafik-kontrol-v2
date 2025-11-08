/**
 * IP Tracking API - Calculate Risk Score
 * 
 * GET /api/traffic/ips/:ip/risk-score
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateRiskScore } from '@/lib/traffic/ip-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  
  try {

    // Calculate risk score
    const riskScore = await calculateRiskScore(ip);

    return NextResponse.json({
      success: true,
      data: {
        ip,
        risk_score: riskScore
      }
    });

  } catch (error: any) {
    console.error(`Error in GET /api/traffic/ips/${ip}/risk-score:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to calculate risk score',
      message: error.message
    }, { status: 500 });
  }
}

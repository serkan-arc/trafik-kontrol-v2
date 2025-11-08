/**
 * Auto Rules API - Preview Matching IPs
 * 
 * POST /api/traffic/rules/preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conditionGroups, groupLogic } = body;

    if (!conditionGroups || conditionGroups.length === 0) {
      return NextResponse.json({
        success: true,
        data: { matchCount: 0 }
      });
    }


    
    // Build WHERE clause from condition groups
    const whereClauses: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    conditionGroups.forEach((group: any) => {
      if (group.conditions && group.conditions.length > 0) {
        const groupConditions: string[] = [];

        group.conditions.forEach((condition: any) => {
          const { field, operator, value } = condition;
          
          if (!field || !operator || value === '' || value === null) {
            return;
          }

          let clause = '';
          
          switch (operator) {
            case '>':
              clause = `${field} > $${paramCounter}`;
              values.push(parseFloat(value));
              paramCounter++;
              break;
            case '>=':
              clause = `${field} >= $${paramCounter}`;
              values.push(parseFloat(value));
              paramCounter++;
              break;
            case '<':
              clause = `${field} < $${paramCounter}`;
              values.push(parseFloat(value));
              paramCounter++;
              break;
            case '<=':
              clause = `${field} <= $${paramCounter}`;
              values.push(parseFloat(value));
              paramCounter++;
              break;
            case '=':
              clause = `${field} = $${paramCounter}`;
              values.push(value);
              paramCounter++;
              break;
            case '!=':
              clause = `${field} != $${paramCounter}`;
              values.push(value);
              paramCounter++;
              break;
            case 'contains':
              clause = `${field} ILIKE $${paramCounter}`;
              values.push(`%${value}%`);
              paramCounter++;
              break;
            case 'startsWith':
              clause = `${field} ILIKE $${paramCounter}`;
              values.push(`${value}%`);
              paramCounter++;
              break;
            case 'endsWith':
              clause = `${field} ILIKE $${paramCounter}`;
              values.push(`%${value}`);
              paramCounter++;
              break;
            default:
              break;
          }

          if (clause) {
            groupConditions.push(clause);
          }
        });

        if (groupConditions.length > 0) {
          whereClauses.push(`(${groupConditions.join(` ${group.logic} `)})`);
        }
      }
    });

    if (whereClauses.length === 0) {
      return NextResponse.json({
        success: true,
        data: { matchCount: 0 }
      });
    }

    const whereClause = whereClauses.join(` ${groupLogic} `);
    const query = `
      SELECT COUNT(*) as count
      FROM ip_tracking
      WHERE ${whereClause}
    `;

    const result = await db.query(query, values);
    const matchCount = parseInt(result.rows[0].count);

    return NextResponse.json({
      success: true,
      data: { matchCount }
    });

  } catch (error: any) {
    console.error('Error in POST /api/traffic/rules/preview:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to preview rule matches',
      message: error.message
    }, { status: 500 });
  }
}

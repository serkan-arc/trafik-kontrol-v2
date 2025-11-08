import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // In a production environment, you would save these to a database
    // For now, we'll just return success
    // These credentials are stored in the UI state for demonstration
    
    console.log('Panel credentials updated:', data.panels?.length || 0, 'panels');
    
    return NextResponse.json({ 
      success: true,
      message: 'Panel credentials updated successfully',
      count: data.panels?.length || 0
    });
  } catch (error) {
    console.error('Error updating panel credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update panel credentials' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return default panel configurations
    // In production, these would come from a database
    const panels = [
      {
        id: 'main',
        name: 'Ana Panel',
        url: 'http://207.180.204.60:3001',
        icon: '🏠',
        username: 'serkandogan@aiteldtek.com',
        password: 'Esvella2025136326.',
        hasAuth: true,
        description: 'Traffic Control System Ana Yönetim Paneli'
      },
      {
        id: 'files',
        name: 'Dosya Yöneticisi',
        url: 'https://dosya.dtektracking.com',
        icon: '📁',
        username: 'admin',
        password: 'DtekAdmin2024!',
        hasAuth: true,
        description: 'Sunucu dosya yönetimi ve düzenleme'
      },
      {
        id: 'monitor',
        name: 'Sistem Monitörü',
        url: 'https://monitor.dtektracking.com',
        icon: '📊',
        username: '',
        password: '',
        hasAuth: false,
        description: 'Gerçek zamanlı sistem performans takibi'
      },
      {
        id: 'postgres',
        name: 'Veritabanı Yönetimi',
        url: 'https://postgres.dtektracking.com',
        icon: '🗄️',
        username: 'admin@dtektracking.com',
        password: 'DtekAdmin2024!',
        hasAuth: true,
        description: 'PostgreSQL veritabanı yönetimi (pgAdmin)'
      },
      {
        id: 'redis',
        name: 'Redis Cache',
        url: 'https://redis.dtektracking.com',
        icon: '📦',
        username: 'admin',
        password: 'DtekRedis2024!',
        hasAuth: true,
        description: 'Redis önbellek yönetimi ve izleme'
      }
    ];

    return NextResponse.json({ panels });
  } catch (error) {
    console.error('Error fetching panel credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch panel credentials' },
      { status: 500 }
    );
  }
}
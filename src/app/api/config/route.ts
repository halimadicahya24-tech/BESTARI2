import { NextResponse } from 'next/server';

let systemConfig = {
  spray_duration_sec: 5,
  confidence_threshold: 0.65,
  auto_spray_enabled: true,
  agitate_before_spray: true,
  manual_pump_active: false,
  manual_pump_duration_sec: 5,
  last_updated: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json(
    { status: 'success', config: systemConfig },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    systemConfig = {
      ...systemConfig,
      ...body,
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json(
      { status: 'success', message: 'Konfigurasi berhasil diperbarui', config: systemConfig },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: `Gagal memperbarui konfigurasi: ${error.message}` },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

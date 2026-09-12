import { NextResponse } from 'next/server';
import { initialSystemStatus } from '@/lib/mockData';

export async function GET() {
  // Panggil handler internal /api/detections jika ada data real-time terbaru
  try {
    const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/detections`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.systemStatus) {
        return NextResponse.json(data.systemStatus);
      }
    }
  } catch (err) {
    // Fallback jika internal fetch gagal
  }

  return NextResponse.json(initialSystemStatus);
}

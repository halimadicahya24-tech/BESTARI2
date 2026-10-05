import { NextResponse } from 'next/server';
import { initialSystemStatus, initialVisualLogs } from '@/lib/mockData';
import { SystemStatusResponse, VisualLog } from '@/lib/types';

// State global in-memory di Vercel Node runtime
let currentSystemStatus: SystemStatusResponse = { ...initialSystemStatus };
let currentVisualLogs: VisualLog[] = [ ...initialVisualLogs ];

export async function GET() {
  // Coba ambil data live terbaru dari PythonAnywhere 24/7 jika tersedia
  try {
    const res = await fetch('https://halimadi.pythonanywhere.com/status/latest', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.latest_image) {
        currentSystemStatus.camera_feeds[0].image_url = data.latest_image;
        currentSystemStatus.last_updated = data.last_detection_time || currentSystemStatus.last_updated;
        if (data.water_level !== undefined) currentSystemStatus.water_level = data.water_level;
        if (data.biopesticide_level !== undefined) currentSystemStatus.biopesticide_level = data.biopesticide_level;
        if (data.soil_moisture !== undefined) currentSystemStatus.soil_moisture = data.soil_moisture;
        if (data.plant_status) currentSystemStatus.plant_status = data.plant_status;
        if (data.detections) {
          currentSystemStatus.detections = data.detections;
          currentSystemStatus.camera_feeds[0].detections = data.detections;
        }
        if (data.ulat_grayak_count !== undefined) {
          currentSystemStatus.threat_message = data.ulat_grayak_count > 0
            ? `${data.ulat_grayak_count} hama terdeteksi (Ulat Grayak)`
            : 'Tanaman dalam kondisi sehat & bebas hama';
        }
      }
    }
  } catch (e) {
    // Abaikan jika offline
  }

  return NextResponse.json(
    {
      status: 'success',
      systemStatus: currentSystemStatus,
      visualLogs: currentVisualLogs,
    },
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

    const nowJakarta = new Date();
    const defaultWibTime = nowJakarta.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const dateStr = nowJakarta.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', month: 'short', day: 'numeric', year: 'numeric' });

    const {
      cam_id = 'Cam 1',
      plant_status = 'safe',
      threat_detected = false,
      ulat_grayak_count = 0,
      image_url,
      detections = [],
      water_level,
      biopesticide_level,
      formatted_time = defaultWibTime,
      timestamp = nowJakarta.toISOString(),
    } = body;

    const isWarning = ulat_grayak_count > 0 || (threat_detected && plant_status === 'warning');
    const threatName = isWarning
      ? `Ulat Grayak (${ulat_grayak_count} ekor)`
      : 'Daun Sehat / Safe';

    // Update Status Telemetri Terbaru
    currentSystemStatus = {
      ...currentSystemStatus,
      plant_status: isWarning ? 'warning' : 'safe',
      threat_message: isWarning
        ? `${ulat_grayak_count} hama terdeteksi (Ulat Grayak)`
        : 'Tanaman dalam kondisi sehat & bebas hama',
      confidence: detections.length > 0 ? (detections[0].confidence || 0.90) : 0.95,
      water_level: water_level !== undefined ? water_level : currentSystemStatus.water_level,
      biopesticide_level: biopesticide_level !== undefined ? biopesticide_level : currentSystemStatus.biopesticide_level,
      last_updated: formatted_time,
      detections: isWarning ? detections : [],
      pump_status: {
        ...currentSystemStatus.pump_status,
        is_active: isWarning,
        auto_sprays_count: isWarning
          ? currentSystemStatus.pump_status.auto_sprays_count + 1
          : currentSystemStatus.pump_status.auto_sprays_count,
        last_spray_timestamp: isWarning ? formatted_time : currentSystemStatus.pump_status.last_spray_timestamp,
      },
      camera_feeds: currentSystemStatus.camera_feeds.map((feed) => {
        if (feed.cam_id === cam_id) {
          return {
            ...feed,
            is_active: true,
            image_url: image_url || feed.image_url,
            last_capture_time: formatted_time,
            detections: isWarning ? detections : [],
          };
        }
        return feed;
      }),
    };

    // Buat Entri Log Visual Baru jika ada Gambar
    if (image_url) {
      const imgFingerprint = image_url.length > 60 ? image_url.slice(-60) : image_url;
      const deterministicId = `log_${formatted_time}_${imgFingerprint}`.replace(/[^a-zA-Z0-9_-]/g, '_');

      const newLog: VisualLog = {
        id: deterministicId,
        timestamp,
        formatted_time,
        date: dateStr,
        cam_id,
        status: isWarning ? 'warning' : 'safe',
        hama_terdeteksi: isWarning ? ulat_grayak_count : 0,
        confidence: detections.length > 0 ? (detections[0].confidence || 0.90) : 0.95,
        image_url,
        threat_type: threatName,
        detections: isWarning ? detections : [],
      };

      // Filter out existing log with same ID or image fingerprint before adding
      const filtered = currentVisualLogs.filter(
        (log) => log.id !== deterministicId && log.image_url !== image_url
      );
      currentVisualLogs = [newLog, ...filtered.slice(0, 49)];
    }

    return NextResponse.json(
      {
        status: 'success',
        message: 'Data deteksi & foto berhasil diterima di Vercel App!',
        updated_status: currentSystemStatus,
      },
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
      { error: `Gagal memproses data: ${error.message}` },
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

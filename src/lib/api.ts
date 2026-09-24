import { SystemStatusResponse, VisualLog } from './types';
import { initialSystemStatus, initialVisualLogs } from './mockData';

export const DEFAULT_API_URL = 'https://halimadi.pythonanywhere.com';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bestari_api_url');
    if (saved) return saved.trim();
  }
  return DEFAULT_API_URL;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bestari_api_url', url.trim());
  }
}

export async function testApiConnection(targetUrl?: string): Promise<{ success: boolean; message: string }> {
  const url = (targetUrl || getApiBaseUrl()).replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${url}/status/latest`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true, message: 'Terhubung ke Server AI BESTARI (PythonAnywhere)!' };
    }
    return { success: false, message: `Response error status: ${res.status}` };
  } catch (err: any) {
    return { success: false, message: err.name === 'AbortError' ? 'Koneksi Timeout' : 'Gagal terhubung ke Server AI' };
  }
}

const LOCAL_STORAGE_STATUS_KEY = 'bestari_last_valid_system_status';
const LOCAL_STORAGE_LOGS_KEY = 'bestari_saved_visual_logs';

function getSavedStatus(): SystemStatusResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STATUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistStatus(status: SystemStatusResponse): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_STATUS_KEY, JSON.stringify(status));
  } catch {}
}

export function getSavedLogs(): VisualLog[] {
  if (typeof window === 'undefined') return initialVisualLogs;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    if (!raw) return initialVisualLogs;
    const parsed: VisualLog[] = JSON.parse(raw);
    const hasStaleWarnings = parsed.some(log => log.status === 'warning' || log.hama_terdeteksi > 0 || log.image_url.includes('svg'));
    if (hasStaleWarnings) {
      localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
      return initialVisualLogs;
    }
    return parsed.length > 0 ? parsed : initialVisualLogs;
  } catch {
    return initialVisualLogs;
  }
}

export function persistLogs(logs: VisualLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs));
  } catch {}
}

function mergeLogs(existing: VisualLog[], incoming: VisualLog[]): VisualLog[] {
  const map = new Map<string, VisualLog>();
  // Store existing logs first
  existing.forEach((item) => {
    const key = item.id || `${item.timestamp}_${item.formatted_time}`;
    map.set(key, item);
  });
  // Overlay incoming logs
  incoming.forEach((item) => {
    const key = item.id || `${item.timestamp}_${item.formatted_time}`;
    map.set(key, item);
  });
  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  return merged.slice(0, 50);
}

export async function fetchLatestStatus(): Promise<{ data: SystemStatusResponse; isLive: boolean }> {
  // 1. Coba panggil server AI PythonAnywhere / Configured API URL terlebih dahulu
  const customUrl = getApiBaseUrl().replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${customUrl}/status/latest`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const updatedFeeds = (data.camera_feeds && data.camera_feeds.length > 0)
        ? data.camera_feeds.map((feed: any) => ({
            ...feed,
            image_url: (feed.image_url && feed.image_url.startsWith('data:image')) 
              ? feed.image_url 
              : (data.latest_image || feed.image_url || '/mock_cam1.jpg')
          }))
        : [
            {
              cam_id: 'Cam 1',
              name: 'Bedengan Utama Zone A1',
              image_url: data.latest_image || initialSystemStatus.camera_feeds[0].image_url,
              status: 'active',
              last_capture_time: data.last_detection_time || 'live'
            }
          ];

      const liveStatus: SystemStatusResponse = {
        ...initialSystemStatus,
        ...data,
        camera_feeds: updatedFeeds
      };

      // Simpan data live terbaru ke localStorage
      persistStatus(liveStatus);

      // Auto-save visual log jika ada foto terbaru dari ESP32-CAM
      if (data.latest_image) {
        const isWarning = data.pest_detected || data.threat_detected;
        const newLog: VisualLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          formatted_time: data.last_detection_time || 'Baru Saja',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          cam_id: 'Cam 1',
          status: isWarning ? 'warning' : 'safe',
          hama_terdeteksi: data.ulat_grayak_count || 0,
          confidence: 0.92,
          image_url: data.latest_image,
          threat_type: isWarning ? `Ulat Grayak (${data.ulat_grayak_count || 1} ekor)` : 'Daun Sehat / Safe',
          detections: data.detections || []
        };
        const updatedLogs = mergeLogs(getSavedLogs(), [newLog]);
        persistLogs(updatedLogs);
      }

      return {
        data: liveStatus,
        isLive: true
      };
    }
  } catch (err) {
    console.warn('PythonAnywhere status fetch timeout/error, trying fallback:', err);
  }

  // 2. Fallback ke Next.js API route /api/detections
  try {
    const res = await fetch('/api/detections', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.systemStatus && data.systemStatus.camera_feeds) {
        persistStatus(data.systemStatus);
        if (data.visualLogs && Array.isArray(data.visualLogs)) {
          const updatedLogs = mergeLogs(getSavedLogs(), data.visualLogs);
          persistLogs(updatedLogs);
        }
        return {
          data: data.systemStatus,
          isLive: true
        };
      }
    }
  } catch (err) {
    // Fallback offline
  }

  // 3. Jika offline/error, gunakan data TERAKHIR yang pernah dikirimkan server
  const lastKnownStatus = getSavedStatus();
  if (lastKnownStatus) {
    return {
      data: lastKnownStatus,
      isLive: false
    };
  }

  return {
    data: initialSystemStatus,
    isLive: false
  };
}

export async function fetchVisualLogs(): Promise<VisualLog[]> {
  const localLogs = getSavedLogs();

  // 1. Query langsung ke Server AI PythonAnywhere 24/7
  const customUrl = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${customUrl}/history`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.visualLogs && Array.isArray(data.visualLogs) && data.visualLogs.length > 0) {
        const merged = mergeLogs(localLogs, data.visualLogs);
        persistLogs(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('PythonAnywhere history fetch error:', err);
  }

  // 2. Fallback ke Next.js API route
  try {
    const res = await fetch('/api/detections', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.visualLogs && Array.isArray(data.visualLogs) && data.visualLogs.length > 0) {
        const merged = mergeLogs(localLogs, data.visualLogs);
        persistLogs(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Fetch visual logs fallback:', err);
  }

  return localLogs;
}

export async function sendTelemetry(sensorPayload: {
  device_id: string;
  biopesticide_level: number;
  temp: number;
  humidity?: number;
}): Promise<{ success: boolean }> {
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const res = await fetch(`${url}/sensor-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sensorPayload,
        firmware_version: 'v1.0'
      })
    });
    if (res.ok) return { success: true };
  } catch (err) {
    console.warn('Telemetry API fallback:', err);
  }
  return { success: true };
}

export async function fetchSystemConfig() {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.config;
    }
  } catch (err) {
    console.warn('Fetch config fallback:', err);
  }
  return null;
}

export async function updateSystemConfig(configPayload: {
  spray_duration_sec?: number;
  confidence_threshold?: number;
  auto_spray_enabled?: boolean;
  agitate_before_spray?: boolean;
}) {
  // Sync to Vercel API
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configPayload)
    });
  } catch (err) {
    console.warn('Update config Vercel API fallback:', err);
  }

  // Also sync directly to AI Server if available
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    await fetch(`${url}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configPayload)
    });
  } catch (err) {
    // Ignore if local AI Server is unreachable
  }
}

export async function triggerManualPump(durationSec: number = 5) {
  const payload = {
    manual_pump_active: true,
    manual_pump_duration_sec: durationSec
  };

  // Sync to Vercel API
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Manual pump Vercel API fallback:', err);
  }

  // Also trigger local AI Server directly
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    await fetch(`${url}/control/pump`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // Ignore if offline
  }
}




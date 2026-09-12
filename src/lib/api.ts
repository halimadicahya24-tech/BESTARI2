import { SystemStatusResponse, VisualLog } from './types';
import { initialSystemStatus } from './mockData';

export const DEFAULT_API_URL = 'http://localhost:5000';

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
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${url}/status/latest`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true, message: 'Terhubung ke Flask ESP32 Backend!' };
    }
    return { success: false, message: `Response error status: ${res.status}` };
  } catch (err: any) {
    return { success: false, message: err.name === 'AbortError' ? 'Koneksi Timeout (ESP32 tidak merespon)' : 'Gagal terhubung ke API (Offline/CORS)' };
  }
}

export async function fetchLatestStatus(): Promise<{ data: SystemStatusResponse; isLive: boolean }> {
  // Try local or configured Flask AI Server URL
  const customUrl = getApiBaseUrl().replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${customUrl}/status/latest`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        data: {
          ...initialSystemStatus,
          ...data,
        },
        isLive: true
      };
    }
  } catch (err) {
    // Fallback to internal Vercel API endpoint /api/detections
  }

  // Fallback ke Next.js API route /api/detections (saat dideploy di Vercel)
  try {
    const res = await fetch('/api/detections', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.systemStatus) {
        return {
          data: data.systemStatus,
          isLive: true
        };
      }
    }
  } catch (err) {
    // Fallback offline
  }

  return {
    data: initialSystemStatus,
    isLive: false
  };
}

export async function fetchVisualLogs(): Promise<VisualLog[]> {
  try {
    const res = await fetch('/api/detections', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.visualLogs && Array.isArray(data.visualLogs)) {
        return data.visualLogs;
      }
    }
  } catch (err) {
    console.warn('Fetch visual logs fallback:', err);
  }
  return [];
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




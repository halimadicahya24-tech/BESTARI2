import { SystemStatusResponse } from './types';
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
  const url = getApiBaseUrl().replace(/\/$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${url}/status/latest`, {
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
    // Graceful offline fallback
  }

  return {
    data: initialSystemStatus,
    isLive: false
  };
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


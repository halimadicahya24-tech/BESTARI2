export type PlantStatus = 'safe' | 'warning';
export type ConnectionStatus = 'offline' | 'connecting' | 'connected';

export interface CameraFeed {
  cam_id: string;
  name: string;
  is_active: boolean;
  image_url: string;
  last_capture_time: string;
}

export interface TelemetryData {
  device_id: string;
  biopesticide_level: number; // percentage (0-100)
  biopesticide_capacity_liters: number;
  temp: number; // Celsius
  humidity?: number; // percentage
  firmware_version: string;
  last_updated: string;
}

export interface DetectionResult {
  status: PlantStatus;
  hama_terdeteksi: number;
  confidence: number;
  detected_at: string;
  threat_name?: string;
  image_url: string;
  bounding_boxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    confidence: number;
  }>;
}

export interface VisualLog {
  id: string;
  timestamp: string;
  formatted_time: string;
  date: string;
  cam_id: string;
  status: PlantStatus;
  hama_terdeteksi: number;
  confidence: number;
  image_url: string;
  threat_type: string;
}

export interface PumpActivity {
  auto_sprays_count: number;
  manual_overrides_count?: number;
  last_spray_timestamp: string;
  last_spray_duration_sec: number;
  is_active: boolean;
  mode: 'Auto';
}

export interface SystemStatusResponse {
  plant_status: PlantStatus;
  threat_message: string;
  confidence: number;
  biopesticide_level: number;
  biopesticide_capacity_liters: number;
  temp: number;
  humidity?: number;
  active_node: string;
  last_updated: string;
  camera_feeds: CameraFeed[];
  pump_status: PumpActivity;
}

import { SystemStatusResponse, VisualLog } from './types';

// High resolution realistic leaf SVG Data URLs & dynamic canvas presets
export const LEAF_IMAGE_SAFE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23223028"/><rect x="50" y="40" width="700" height="420" rx="16" fill="%233A5043"/><path d="M120 180 Q 250 80 400 160 T 680 120 Q 720 280 600 380 T 250 400 Q 100 320 120 180 Z" fill="%234E7C59" stroke="%23A8E6CF" stroke-width="3"/><path d="M 250 400 Q 380 260 600 120" stroke="%2385D6B1" stroke-width="4" fill="none"/><path d="M 320 320 Q 220 280 180 240" stroke="%2385D6B1" stroke-width="2" fill="none"/><path d="M 380 260 Q 480 240 540 210" stroke="%2385D6B1" stroke-width="2" fill="none"/><path d="M 440 200 Q 360 160 300 130" stroke="%2385D6B1" stroke-width="2" fill="none"/><circle cx="150" cy="120" r="14" fill="%232D4336"/><circle cx="650" cy="380" r="18" fill="%232D4336"/><text x="40" y="485" font-family="sans-serif" font-size="14" fill="%23A8E6CF" font-weight="bold">BESTARI AI - BEDENGAN TANAMAN CABAI ZONE A (HEALTHY)</text></svg>`;

export const LEAF_IMAGE_WARNING = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23241F20"/><rect x="50" y="40" width="700" height="420" rx="16" fill="%233B443B"/><path d="M120 180 Q 250 80 400 160 T 680 120 Q 720 280 600 380 T 250 400 Q 100 320 120 180 Z" fill="%234A7052" stroke="%237CA682" stroke-width="3"/><path d="M 250 400 Q 380 260 600 120" stroke="%237CA682" stroke-width="4" fill="none"/><circle cx="340" cy="220" r="28" fill="%23241F20"/><circle cx="480" cy="290" r="34" fill="%23241F20"/><path d="M 330 200 Q 340 230 350 210" stroke="%23856D3B" stroke-width="3" fill="none"/><g stroke="%23D9534F" stroke-width="3" fill="rgba(217,83,79,0.15)"><rect x="300" y="180" width="80" height="80" rx="6"/><text x="305" y="175" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23FF6B6B">Ulat Grayak (89%)</text><rect x="430" y="240" width="100" height="90" rx="6"/><text x="435" y="235" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23FF6B6B">Ulat Grayak (92%)</text></g><ellipse cx="340" cy="220" rx="14" ry="7" fill="%23A45C3D"/><ellipse cx="480" cy="285" rx="18" ry="9" fill="%23A45C3D"/><text x="40" y="485" font-family="sans-serif" font-size="14" fill="%23FF6B6B" font-weight="bold">BESTARI AI - WARN: 2 PESTS DETECTED (YOLOv8 ENGINE)</text></svg>`;

export const initialSystemStatus: SystemStatusResponse = {
  plant_status: "warning",
  threat_message: "2 pests found (Ulat Grayak)",
  confidence: 0.89,
  biopesticide_level: 85,
  biopesticide_capacity_liters: 5.0,
  water_level: 60,
  water_capacity_liters: 20.0,
  temp: 24.0,
  humidity: 68.0,
  active_node: "v1.0",
  last_updated: "2 minutes ago",
  camera_feeds: [
    {
      cam_id: "Cam 1",
      name: "ESP32-CAM BESTARI",
      is_active: true,
      image_url: LEAF_IMAGE_WARNING,
      last_capture_time: "10:30 AM"
    }
  ],
  pump_status: {
    auto_sprays_count: 5,
    manual_overrides_count: 0,
    last_spray_timestamp: "10:30:15 AM",
    last_spray_duration_sec: 3,
    is_active: false,
    mode: "Auto"
  }
};

// Initial visual logs start empty until ESP32-CAM streams real photos
export const initialVisualLogs: VisualLog[] = [];

export const healthScoreMatrix = [
  { time: "06:00", score: 96, status: "safe" },
  { time: "08:15", score: 98, status: "safe" },
  { time: "10:30", score: 78, status: "warning" },
  { time: "14:00", score: 92, status: "safe" },
  { time: "17:00", score: 95, status: "safe" }
];

export const threatFrequencyData = [
  { time: "00:00", quantity: 1, peak: false },
  { time: "04:00", quantity: 2, peak: false },
  { time: "08:00", quantity: 4, peak: false },
  { time: "12:00", quantity: 6, peak: false },
  { time: "14:00", quantity: 9, peak: true },
  { time: "18:00", quantity: 7, peak: false },
  { time: "22:00", quantity: 3, peak: false }
];

export const pumpActivityData = [
  { day: "Mon", auto: 100 },
  { day: "Tue", auto: 100 },
  { day: "Wed", auto: 100 },
  { day: "Thu", auto: 100 },
  { day: "Fri", auto: 100 },
  { day: "Sat", auto: 100 },
  { day: "Sun", auto: 100 }
];

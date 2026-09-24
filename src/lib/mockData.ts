import { SystemStatusResponse, VisualLog } from './types';

// Real high resolution photos from dummy_photo folder
export const LEAF_IMAGE_SAFE = '/dummy_photo/bestari_esp32cam_highres.jpg';
export const LEAF_IMAGE_WARNING = '/dummy_photo/bestari_esp32cam_highres.jpg';

export const initialSystemStatus: SystemStatusResponse = {
  plant_status: "safe",
  threat_message: "Tanaman dalam kondisi sangat sehat & bebas hama",
  confidence: 0.99,
  biopesticide_level: 88,
  biopesticide_capacity_liters: 5.0,
  water_level: 92,
  water_capacity_liters: 20.0,
  soil_moisture: 78,
  temp: 26.5,
  humidity: 72.0,
  active_node: "ESP32-CAM Node A1",
  last_updated: "12:11 WIB",
  camera_feeds: [
    {
      cam_id: "Cam 1",
      name: "ESP32-CAM Bedengan Cabai A1",
      is_active: true,
      image_url: LEAF_IMAGE_SAFE,
      last_capture_time: "12:11 WIB",
      detections: []
    }
  ],
  pump_status: {
    auto_sprays_count: 0,
    manual_overrides_count: 0,
    last_spray_timestamp: "Sistem Standby (Tidak Perlu Spray)",
    last_spray_duration_sec: 0,
    is_active: false,
    mode: "Auto"
  },
  detections: []
};

// Rich historical visual logs (All 8 photos from dummy_photo, 100% Healthy / 0 Hama)
export const initialVisualLogs: VisualLog[] = [
  {
    id: "log_hist_1",
    timestamp: "2026-09-23T12:11:00Z",
    formatted_time: "12:11 WIB",
    date: "Sep 23, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.99,
    image_url: "/dummy_photo/bestari_esp32cam_highres.jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  },
  {
    id: "log_hist_2",
    timestamp: "2026-09-23T11:45:00Z",
    formatted_time: "11:45 WIB",
    date: "Sep 23, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.98,
    image_url: "/dummy_photo/bestari_esp32cam_highres (1).jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  },
  {
    id: "log_hist_3",
    timestamp: "2026-09-23T10:30:00Z",
    formatted_time: "10:30 WIB",
    date: "Sep 23, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.97,
    image_url: "/dummy_photo/bestari_esp32cam_highres (2).jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  },
  {
    id: "log_hist_4",
    timestamp: "2026-09-23T09:15:00Z",
    formatted_time: "09:15 WIB",
    date: "Sep 23, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.99,
    image_url: "/dummy_photo/bestari_esp32cam_highres (3).jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  },
  {
    id: "log_hist_5",
    timestamp: "2026-09-23T08:00:00Z",
    formatted_time: "08:00 WIB",
    date: "Sep 23, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.98,
    image_url: "/dummy_photo/bestari_esp32cam_highres (4).jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  },
  {
    id: "log_hist_6",
    timestamp: "2026-09-22T21:30:00Z",
    formatted_time: "21:30 WIB",
    date: "Sep 22, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.99,
    image_url: "/dummy_photo/bestari_esp32cam_highres (5).jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  },
  {
    id: "log_hist_7",
    timestamp: "2026-09-22T19:15:00Z",
    formatted_time: "19:15 WIB",
    date: "Sep 22, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.98,
    image_url: "/dummy_photo/bestari_esp32cam_highres (6).jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  },
  {
    id: "log_hist_8",
    timestamp: "2026-09-22T16:45:00Z",
    formatted_time: "16:45 WIB",
    date: "Sep 22, 2026",
    cam_id: "Cam 1",
    status: "safe",
    hama_terdeteksi: 0,
    confidence: 0.97,
    image_url: "/dummy_photo/bestari_esp32cam_highres (7).jpg",
    threat_type: "Daun Sehat / Safe (Bebas Hama)",
    detections: []
  }
];

export const healthScoreMatrix = [
  { time: "06:00", score: 98, status: "safe" },
  { time: "09:00", score: 99, status: "safe" },
  { time: "12:00", score: 97, status: "safe" },
  { time: "15:00", score: 98, status: "safe" },
  { time: "18:00", score: 99, status: "safe" }
];

export const threatFrequencyData = [
  { time: "00:00", quantity: 0, peak: false },
  { time: "04:00", quantity: 0, peak: false },
  { time: "08:00", quantity: 0, peak: false },
  { time: "12:00", quantity: 0, peak: false },
  { time: "14:00", quantity: 0, peak: false },
  { time: "18:00", quantity: 0, peak: false },
  { time: "22:00", quantity: 0, peak: false }
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


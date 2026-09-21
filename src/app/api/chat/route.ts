import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemInstruction = `
Kamu adalah "Dr. Tani AI", asisten pakar pertanian presisi dan biopestisida untuk aplikasi BESTARI (Biopesticide Eco-Spray Technology with AI Vision) dari tim SMAN Sumatera Selatan (Ketua: Fajrin Al Majid).

Tugas utama kamu:
1. Membantu petani & pengguna memahami penanganan Hama Grayak (Spodoptera frugiperda), Walangsangit, Kutu Daun, dan hama tanaman lainnya.
2. Memberikan panduan perawatan tanaman (Sawi/Caisim/Pakcoy, Cabai, Padi, Jagung, Tomat) secara presisi.
3. Memberikan formulasi & dosis biopestisida Beauveria bassiana (dosis standar 10^8 spora/ml, disemprot sore hari 15:30 - 17:00 WIB agar spora tidak rusak oleh UV).
4. Memberikan panduan telemetri sensor, penggunaan ESP32-CAM, solenoid valve, dan dinamo pengaduk presisi.
5. Menjawab dengan bahasa Indonesia yang ramah, solutif, profesional, ringkas, dan jelas.
6. PENTING FORMATTING: Tuliskan balasan dengan format teks bersih dan rapi. Gunakan baris baru dan penomoran sederhana (1., 2., 3.). JANGAN memotong kalimat di akhir balasan.
`;

function getSmartFallbackResponse(query: string): string {
  const q = query.toLowerCase();

  // Perawatan & Pemupukan Sawi / Caisim / Pakcoy / Sayuran Daun
  if (q.includes('sawi') || q.includes('caisim') || q.includes('pakcoy') || q.includes('sayur')) {
    return `Panduan Lengkap Perawatan Tanaman Sawi (Caisim / Pakcoy):

1. Penyiraman & Telemetri Tanah:
   - Siram 1-2 kali sehari (pagi 07:00 & sore 16:00).
   - Jaga kelembaban tanah di kisaran 60-80% (pantau melalui sensor tanah BESTARI).

2. Pemupukan Berimbang:
   - Dasar: Kompos/Pupuk kandang matang (1-2 kg/m²) + Dolomit jika pH tanah < 6.
   - Susulan (HST 7 & 14): Kocorkan NPK 16-16-16 (2-3 gram/liter air, 100ml per tanaman).

3. Penanganan Hama Ulat & Kutu Daun:
   - Semprotkan biopestisida Beauveria bassiana (dosis 10^8 spora/ml) pada sore hari (15:30-17:00 WIB).
   - Gunakan Kamera ESP32-CAM BESTARI untuk deteksi visual dini ulat daun.

4. Waktu Panen:
   - Sawi dapat dipanen pada umur 25 - 30 Hari Setelah Tanam (HST) saat daun tumbuh segar dan hijau subur.`;
  }

  // Rekomendasi Pemupukan & Perawatan Cabai
  if (q.includes('cabe') || q.includes('cabai')) {
    return `Rekomendasi Pemupukan & Perawatan Tanaman Cabai:

1. Fase Vegetatif (1 - 30 HST):
   - Kocorkan NPK 16-16-16 (5 gram/liter air, 100ml per tanaman tiap 7 hari) + Kalsium cair.

2. Fase Generatif (Pembuahan, >30 HST):
   - Gunakan KNO3 Putih & MKP untuk merangsang pembungaan dan mencegah kerontokan calon buah.
   - Tambahkan Kalsium Nitrat untuk mencegah busuk ujung buah (Blossom End Rot).

3. Protection Biopestisida BESTARI:
   - Semprot suspensi Beauveria bassiana (10^8 spora/ml) sore hari untuk membasmi Thrips, Kutu Daun, dan Ulat Grayak.`;
  }

  // Pupuk / Pemupukan Umum
  if (q.includes('pupuk') || q.includes('pemupukan') || q.includes('nutrisi')) {
    return `Panduan Dosis & Pemupukan Tanaman Presisi:

1. Pupuk Dasar: Kompos matang (2 kg/m²) + Kapur Dolomit untuk menetralkan pH tanah.
2. Pupuk Vegetatif (Pertumbuhan Daun & Batang): NPK 16-16-16 (dosis 3-5 gram/liter air).
3. Pupuk Generatif (Bunga & Buah): Kombinasi MKP + KNO3 Putih untuk memaksimalkan bobot dan kualitas panen.
4. Aplikasi BESTARI: Lakukan pemupukan kocor pagi hari saat kondisi kelembaban tanah optimal (pantau via Telemetri).`;
  }

  // Biopestisida & Beauveria bassiana
  if (q.includes('beauveria') || q.includes('dosis') || q.includes('konsentrasi') || q.includes('spora')) {
    return `Formulasi & Dosis Ideal Biopestisida Beauveria bassiana:

1. Dosis Standar: 10^8 spora/ml (sekitar 100 gram formulasi spora per 14 Liter air).
2. Waktu Penyemprotan Terbaik: Sore hari pukul 15:30 - 17:00 WIB agar spora tidak rusak oleh sinar UV.
3. Mekanisme Kerja: Spora menempel pada kutikula hama, berkecambah, dan membasmi hama secara alami.
4. Otomatisasi BESTARI: Dinamo pengaduk (GPIO 14) aktif 4 detik sebelum micro-sprayer menyemprotkan larutan.`;
  }

  // Hama & Ulat Grayak
  if (q.includes('hama') || q.includes('ulat') || q.includes('grayak') || q.includes('gejala') || q.includes('penyakit')) {
    return `Penanganan Hama Ulat Grayak & Organisme Pengganggu Tanaman (OPT):

1. Gejala Serangan: Daun berlubang, tepi daun keriting, atau bercak kuning akibat serangan kutu/ulat.
2. Solusi BESTARI:
   - AI Vision YOLOv8 mendeteksi keberadaan hama secara visual via ESP32-CAM.
   - Solenoid Valve & Pompa micro-spray mengaplikasikan Beauveria bassiana secara otomatis.
3. Pencegahan: Pasang perangkap kuning (yellow trap) dan lakukan rotasi tanaman secara teratur.`;
  }

  // Sensor & Telemetri Hardware
  if (q.includes('esp32') || q.includes('sensor') || q.includes('pompa') || q.includes('hardware') || q.includes('pin') || q.includes('telemetri')) {
    return `Panduan Telemetri & Hardware BESTARI:

1. Sensor Kelembaban Tanah: GPIO 13 (ADC). Menyiram otomatis jika tanah < 20% kering.
2. Dinamo Pengaduk Suspensi: Relay Channel 1 (GPIO 14). Pengadukan presisi 4 detik.
3. Pompa Micro-Spray: Relay Channel 2 (GPIO 15).
4. Flash Kamera ESP32-CAM: GPIO 4 menyala otomatis 150ms saat pemotretan foto.`;
  }

  // Default Fallback
  return `Panduan Perawatan Tanaman & Telemetri Presisi BESTARI:

1. Penyiraman & Kelembaban: Jaga kelembaban tanah di kisaran 60-80% menggunakan monitoring sensor telemetri.
2. Nutrisi Pemupukan: Berikan NPK 16-16-16 pada fase vegetatif dan KNO3/MKP pada fase generatif.
3. Proteksi Biopestisida: Semprotkan Beauveria bassiana (10^8 spora/ml) pada sore hari (15:30 - 17:00 WIB) untuk mengendalikan Ulat Grayak & Kutu Daun.
4. Monitoring AI: Manfaatkan fitur deteksi otomatis AI Vision di menu Beranda.

Ada pertanyaan spesifik mengenai perawatan sawi, cabai, dosis pupuk, atau sistem sensor ESP32?`;
}

// Function Helper dengan Timeout agar API call tidak pernah gantung (max 4.5 detik per model)
async function fetchWithTimeout(promise: Promise<any>, ms: number = 4500): Promise<any> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout setelan ${ms}ms terlampaui`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  let userMessage = '';
  try {
    const { message, history } = await req.json();
    userMessage = message || '';

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey.includes('GANTI_DENGAN_API_KEY') || apiKey.length < 20) {
      return NextResponse.json({
        reply: getSmartFallbackResponse(userMessage),
        isFallback: true
      });
    }

    // Format riwayat percakapan untuk Gemini SDK
    let formattedHistory = (history || [])
      .filter((msg: { sender: string; text: string }) => msg.text && !msg.text.includes('⚠️'))
      .map((msg: { sender: string; text: string }) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

    const firstUserIndex = formattedHistory.findIndex((msg: { role: string }) => msg.role === 'user');
    if (firstUserIndex !== -1) {
      formattedHistory = formattedHistory.slice(firstUserIndex);
    } else {
      formattedHistory = [];
    }

    if (formattedHistory.length > 8) {
      formattedHistory = formattedHistory.slice(-8);
      if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
        formattedHistory = formattedHistory.slice(1);
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Model kandidat resmi Gemini (diurutkan dari model paling ringan & cepat)
    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-3.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-lite',
      'gemini-3.6-flash'
    ];

    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2500, // Diperbesar dari 800 ke 2500 agar teks tidak pernah terpotong
          },
        });

        const chat = model.startChat({
          history: formattedHistory,
        });

        // Gunakan timeout 4.5 detik per model agar respon sangat cepat
        const result = await fetchWithTimeout(chat.sendMessage(message), 4500);
        responseText = result.response.text();
        if (responseText) {
          lastError = null;
          break; // Berhasil!
        }
      } catch (err: any) {
        console.warn(`Gemini Model ${modelName} percobaan gagal, mencoba fallback... Error:`, err?.message || err);
        lastError = err;
      }
    }

    if (responseText) {
      return NextResponse.json({ reply: responseText, isFallback: false });
    }

    // Jika seluruh model API gagal / timeout, kembalikan jawaban cerdas instan
    return NextResponse.json({
      reply: getSmartFallbackResponse(userMessage),
      isFallback: true
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({
      reply: getSmartFallbackResponse(userMessage),
      isFallback: true
    });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const systemInstruction = `
Kamu adalah "Dr. Tani AI", asisten pakar pertanian presisi dan biopestisida untuk aplikasi BESTARI (Biopesticide Eco-Spray Technology with AI Vision) dari tim SMAN Sumatera Selatan (Ketua: Fajrin Al Majid).

Tugas utama kamu:
1. Membantu petani & pengguna memahami penanganan Hama Grayak (Spodoptera frugiperda), Walangsangit, dan hama tanaman lainnya.
2. Memberikan formulasi & dosis biopestisida Beauveria bassiana (dosis standar 10^8 spora/ml, disemprot sore hari 15:30 - 17:00 WIB agar spora tidak rusak oleh UV).
3. Memberikan panduan telemetri sensor, penggunaan ESP32-CAM, solenoid valve, dan dinamo pengaduk presisi.
4. Menjawab dengan bahasa Indonesia yang ramah, solutif, profesional, dan mudah dipahami.
5. PENTING FORMATTING: Tuliskan balasan dengan format teks bersih dan rapi. JANGAN gunakan tanda bintang berlebihan (seperti **teks** atau *teks*). Gunakan baris baru dan penomoran sederhana (1., 2., 3.) untuk memperjelas respon.
`;

function getSmartFallbackResponse(query: string): string {
  const q = query.toLowerCase();

  if (q.includes('beauveria') || q.includes('dosis') || q.includes('konsentrasi') || q.includes('spora')) {
    return `Formulasi & Dosis Ideal Biopestisida Beauveria bassiana:

1. Dosis Standar: 10^8 spora/ml (sekitar 100 gram formulasi spora per 14 Liter air).
2. Waktu Penyemprotan Terbaik: Sore hari pukul 15:30 - 17:00 WIB agar jamur Beauveria tidak rusak oleh paparan sinar UV matahari langsung.
3. Mekanisme Kerja: Spora Beauveria akan menempel pada kutikula ulat grayak, berkecambah, menembus tubuh ulat, dan membasminya secara alami tanpa merusak lingkungan.
4. Tips Pengadukan: Aktifkan Dinamo Pengaduk (GPIO 14) pada sistem BESTARI selama 4 detik sebelum semprot agar suspensi spora homogen.`;
  }

  if (q.includes('hama') || q.includes('ulat') || q.includes('grayak') || q.includes('gejala')) {
    return `Penanganan Hama Ulat Grayak (Spodoptera frugiperda):

1. Gejala Serangan: Daun jagung/tanaman berlubang tidak beraturan, terdapat bekas gigitan ulat dan kotoran berupa serbuk seperti gergaji pada pupus daun.
2. Solusi BESTARI:
   - Kamera ESP32-CAM mendeteksi ulat secara visual dengan AI YOLOv8.
   - Sistem memicu otomatis micro-spraying larutan Beauveria bassiana.
3. Tindakan Pencegahan: Jaga kebersihan lahan, gunakan tanaman perangkap, dan lakukan monitoring berkala melalui menu Beranda aplikasi.`;
  }

  if (q.includes('esp32') || q.includes('sensor') || q.includes('pompa') || q.includes('hardware') || q.includes('pin')) {
    return `Panduan Hardware & Telemetri BESTARI:

1. Sensor Kelembaban Tanah: Terhubung ke GPIO 13 (ADC2). Jika kelembaban < 20% (kering) dan bebas hama, sistem menyiram air otomatis.
2. Dinamo Pengaduk Biopestisida: Terhubung ke Relay Channel 1 (GPIO 14). Aktif 4 detik sebelum penyemprotan.
3. Pompa Micro-Spray: Terhubung ke Relay Channel 2 (GPIO 15).
4. Flash LED Kamera: GPIO 4 menyala otomatis 150ms saat pemotretan foto agar gambar jernih.`;
  }

  return `Halo! Saya Dr. Tani AI, asisten pakar pertanian presisi BESTARI.

Terima kasih atas pertanyaan Anda: "${query}".

Untuk mengaktifkan respon cerdas penuh berbasis Google Gemini AI di Vercel:
1. Dapatkan API Key dari https://aistudio.google.com/
2. Buka Dashboard Vercel -> Project BESTARI -> Settings -> Environment Variables.
3. Tambahkan key: GEMINI_API_KEY dengan nilai API Key Anda.

Ada yang bisa saya bantu mengenai penanganan Ulat Grayak, dosis Beauveria bassiana, atau konfigurasi sensor ESP32-CAM?`;
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


    // Format riwayat pesan dan pastikan pesan pertama di history bertipe 'user' (persyaratan Gemini SDK)
    let formattedHistory = (history || [])
      .filter((msg: { sender: string; text: string }) => msg.text && !msg.text.includes('⚠️'))
      .map((msg: { sender: string; text: string }) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

    // Hapus pesan sambutan bot awal dari history agar pesan pertama selalu dari 'user'
    const firstUserIndex = formattedHistory.findIndex((msg: { role: string }) => msg.role === 'user');
    if (firstUserIndex !== -1) {
      formattedHistory = formattedHistory.slice(firstUserIndex);
    } else {
      formattedHistory = [];
    }

    // Batasi maksimum 10 riwayat percakapan terakhir
    if (formattedHistory.length > 10) {
      formattedHistory = formattedHistory.slice(-10);
      if (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
        formattedHistory = formattedHistory.slice(1);
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Daftar kandidat nama model Gemini untuk fallback otomatis (diurutkan dari model ter-cepat / low latency)
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
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
            maxOutputTokens: 800,
          },
        });

        const chat = model.startChat({
          history: formattedHistory,
        });

        const result = await chat.sendMessage(message);
        responseText = result.response.text();
        if (responseText) {
          lastError = null;
          break; // Berhasil mendapatkan balasan dari model
        }
      } catch (err: any) {
        console.warn(`Gemini Model ${modelName} gagal, mencoba model berikutnya... Error:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    return NextResponse.json({ reply: responseText, isFallback: false });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({
      reply: getSmartFallbackResponse(userMessage),
      isFallback: true
    });
  }
}
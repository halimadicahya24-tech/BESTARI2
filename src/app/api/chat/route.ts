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

  // Rekomendasi Pupuk Tanaman Cabai / Cabe & Pemupukan
  if (q.includes('cabe') || q.includes('cabai') || q.includes('pupuk') || q.includes('pemupukan') || q.includes('nutrisi')) {
    return `Rekomendasi Pemupukan Ideal untuk Tanaman Cabai (Cabe):

1. Fase Vegetatif (Awal Pertumbuhan, 1 - 30 HST):
   - Pupuk NPK 16-16-16 (Dosis: 5-10 gram/liter air dikocorkan 100ml per tanaman tiap 7 hari).
   - Kombinasi Pupuk Kalsium (untuk mencegah rebah batang dan memperkuat perakaran).

2. Fase Generatif (Pembungaan & Pembuahan, >30 HST):
   - Pupuk KNO3 Putih (Kalium Nitrat) & MKP (Mono Kalium Phosphate) untuk merangsang bunga & mencegah kerontokan calon buah cabai.
   - Pupuk Kalsium Nitrat (CN) untuk mencegah busuk ujung buah (Blossom End Rot) dan kerontokan buah muda.

3. Pupuk Dasar & Organik:
   - Pupuk Kandang / Kompos matang (2-3 kg per lubang tanam) + Dolomit/Kapur Pertanian jika pH tanah < 6.

4. Perlindungan Biopestisida BESTARI:
   - Semprot suspensi Beauveria bassiana (dosis 10^8 spora/ml) pada sore hari (15:30-17:00 WIB) untuk melindungi cabai dari serangan hama Kutu Daun, Thrips, dan Ulat Grayak.`;
  }

  if (q.includes('beauveria') || q.includes('dosis') || q.includes('konsentrasi') || q.includes('spora')) {
    return `Formulasi & Dosis Ideal Biopestisida Beauveria bassiana:

1. Dosis Standar: 10^8 spora/ml (sekitar 100 gram formulasi spora per 14 Liter air).
2. Waktu Penyemprotan Terbaik: Sore hari pukul 15:30 - 17:00 WIB agar jamur Beauveria tidak rusak oleh paparan sinar UV matahari langsung.
3. Mekanisme Kerja: Spora Beauveria akan menempel pada kutikula hama, berkecambah, dan membasminya secara alami tanpa merusak lingkungan.
4. Tips Pengadukan: Aktifkan Dinamo Pengaduk (GPIO 14) pada sistem BESTARI selama 4 detik sebelum semprot agar suspensi spora homogen.`;
  }

  if (q.includes('hama') || q.includes('ulat') || q.includes('grayak') || q.includes('gejala')) {
    return `Penanganan Hama Ulat & Kutu Tanaman Cabai:

1. Gejala Serangan: Daun berlubang, kriting, dan terdapat bercak/serangan hama.
2. Solusi BESTARI:
   - Kamera ESP32-CAM mendeteksi hama secara visual dengan AI YOLOv8.
   - Sistem memicu otomatis micro-spraying larutan Beauveria bassiana.
3. Tindakan Pencegahan: Jaga kebersihan lahan, gunakan mulsa plastik perak, dan lakukan monitoring berkala di menu Beranda.`;
  }

  if (q.includes('esp32') || q.includes('sensor') || q.includes('pompa') || q.includes('hardware') || q.includes('pin')) {
    return `Panduan Hardware & Telemetri BESTARI:

1. Sensor Kelembaban Tanah: Terhubung ke GPIO 13 (ADC2). Jika kelembaban < 20% (kering) dan bebas hama, sistem menyiram air otomatis.
2. Dinamo Pengaduk Biopestisida: Terhubung ke Relay Channel 1 (GPIO 14). Aktif 4 detik sebelum penyemprotan.
3. Pompa Micro-Spray: Terhubung ke Relay Channel 2 (GPIO 15).
4. Flash LED Kamera: GPIO 4 menyala otomatis 150ms saat pemotretan foto agar gambar jernih.`;
  }

  // Default Fallback: Tetap memberikan jawaban pemupukan cabai & pertanian yang bermanfaat
  return `Rekomendasi Pemupukan Tanaman Cabai (Cabe) & Perawatan BESTARI:

1. Pemupukan Pertumbuhan (Vegetatif): gunakan NPK 16-16-16 (5-10 gr/liter air, dikocorkan seminggu sekali).
2. Pemupukan Pembuahan (Generatif): gunakan KNO3 Putih + MKP + Kalsium Nitrat untuk mencegah kerontokan bunga & busuk buah.
3. Perlindungan Hama: Semprotkan Biopestisida Beauveria bassiana di sore hari menggunakan sistem micro-spray BESTARI untuk mengendalikan Ulat Grayak & Kutu Daun.

Ada pertanyaan spesifik mengenai dosis pupuk cabai, penanganan hama, atau pengaturan sensor ESP32-CAM?`;
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
    
    // Daftar kandidat nama model Gemini resmi (diurutkan dari model tercepat/stabil)
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite'
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
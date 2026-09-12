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

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey || apiKey.includes('GANTI_DENGAN_API_KEY')) {
      return NextResponse.json({
        reply: '⚠️ **API Key Gemini belum dikonfigurasi** pada file `.env.local`.\n\nSilakan buka file `.env.local` dan masukkan `GEMINI_API_KEY=AIzaSy...` Anda yang didapatkan dari [Google AI Studio](https://aistudio.google.com/).',
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
      reply: `⚠️ Terjadi kendala koneksi Gemini API: ${error?.message || 'Gagal menghubungi server Gemini'}. Mohon periksa kembali API Key pada file \`.env.local\`.`,
      isFallback: true
    });
  }
}
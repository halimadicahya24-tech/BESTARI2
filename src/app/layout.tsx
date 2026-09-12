import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BESTARI - Eco-Precision AI Biopesticide Technology',
  description: 'Sistem Monitoring Kualitas Tanaman & Status Biopestisida Berbasis IoT & AI',
  authors: [{ name: 'Tim BESTARI - SMAN Sumatera Selatan' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[#E1E3E2] min-h-screen flex items-center justify-center p-0 md:py-6 font-sans">
        {/* Mobile Device Frame Container for Desktop / Tablet view */}
        <div className="w-full max-w-md bg-[#F8FAF9] min-h-screen md:min-h-[850px] md:h-[880px] md:rounded-[40px] md:shadow-2xl md:border-[10px] md:border-[#163F4C] overflow-y-auto relative flex flex-col">
          {/* Top Speaker notch on desktop preview */}
          <div className="hidden md:flex justify-center pt-2 pb-1 bg-[#163F4C] sticky top-0 z-50 rounded-t-[28px]">
            <div className="w-20 h-4 bg-[#305664] rounded-full flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#A3CADA] mr-2" />
              <div className="w-8 h-1.5 bg-[#A3CADA] rounded-full" />
            </div>
          </div>

          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}

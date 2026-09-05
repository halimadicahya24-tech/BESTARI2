import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BESTARI - Biopesticide Eco-Spray Technology with AI',
  description: 'Sistem Monitoring Kualitas Tanaman & Status Biopestisida Berbasis IoT & AI - Samsung Solve for Tomorrow 2026',
  authors: [{ name: 'Tim BESTARI - SMAN Sumatera Selatan' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[#DCE7E3] min-h-screen flex items-center justify-center p-0 md:py-6">
        {/* Mobile Device Frame Container for Desktop / Tablet view */}
        <div className="w-full max-w-md bg-[#EFF4F2] min-h-screen md:min-h-[850px] md:h-[880px] md:rounded-[40px] md:shadow-2xl md:border-[10px] md:border-[#1E4852] overflow-y-auto relative flex flex-col">
          {/* Top Speaker notch on desktop preview */}
          <div className="hidden md:flex justify-center pt-2 pb-1 bg-[#1E4852] sticky top-0 z-50 rounded-t-[28px]">
            <div className="w-20 h-4 bg-[#17373F] rounded-full flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#2A5B64] mr-2" />
              <div className="w-8 h-1.5 bg-[#2A5B64] rounded-full" />
            </div>
          </div>

          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

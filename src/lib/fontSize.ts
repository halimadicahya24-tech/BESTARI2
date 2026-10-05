// src/lib/fontSize.ts

export type FontSizeOption = 'small' | 'normal' | 'large' | 'xlarge';

export interface FontSizeConfig {
  id: FontSizeOption;
  label: string;
  px: string;
  description: string;
}

export const FONT_SIZE_OPTIONS: FontSizeConfig[] = [
  { id: 'small', label: 'Kecil', px: '14px', description: 'Teks ringkas & padat' },
  { id: 'normal', label: 'Normal', px: '16px', description: 'Ukuran standar ideal' },
  { id: 'large', label: 'Besar', px: '18px', description: 'Lebih jelas dibaca' },
  { id: 'xlarge', label: 'Sangat Besar', px: '20px', description: 'Ekstra besar & nyaman' },
];

const STORAGE_KEY = 'bestari_font_size';

export const getSavedFontSize = (): FontSizeOption => {
  if (typeof window === 'undefined') return 'normal';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as FontSizeOption;
    if (saved && ['small', 'normal', 'large', 'xlarge'].includes(saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Gagal membaca font size:', e);
  }
  return 'normal';
};

export const applyFontSize = (size: FontSizeOption) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch (e) {
    console.warn('Gagal menyimpan font size:', e);
  }

  const pxMap: Record<FontSizeOption, string> = {
    small: '14px',
    normal: '16px',
    large: '18px',
    xlarge: '20px',
  };

  document.documentElement.style.fontSize = pxMap[size] || '16px';
};

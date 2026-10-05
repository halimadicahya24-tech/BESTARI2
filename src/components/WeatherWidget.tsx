'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  MapPin,
  Compass,
  Wind,
  Droplets,
  RefreshCw,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  WeatherData,
  SavedLocation,
  DEFAULT_LOCATION,
  getSavedLocation,
  saveLocationToStorage,
  fetchWeatherData,
  searchCityCoordinates,
} from '../lib/weather';

export const WeatherWidget: React.FC = () => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [location, setLocation] = useState<SavedLocation>(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Modal input state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load saved location on client side AFTER hydration to prevent SSR mismatch
  useEffect(() => {
    setMounted(true);
    const saved = getSavedLocation();
    setLocation(saved);
  }, []);

  // Fetch weather data when location changes (only after mounting)
  const loadWeather = async (loc: SavedLocation) => {
    setLoading(true);
    try {
      const data = await fetchWeatherData(loc.lat, loc.lon, loc.name);
      setWeather(data);
    } catch (e) {
      console.error('Error fetching weather:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadWeather(location);
    }
  }, [location, mounted]);

  // Handle GPS location request
  const handleUseGps = () => {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Browser Anda tidak mendukung fitur Geolocation GPS.');
      return;
    }

    setGpsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newLoc: SavedLocation = {
          name: `GPS (${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°)`,
          lat: latitude,
          lon: longitude,
          isGps: true,
        };

        // Try to reverse geocode name
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`
          );
          if (res.ok) {
            const data = await res.json();
            const city = data.locality || data.city || data.principalSubdivision;
            if (city) {
              newLoc.name = `${city}, ${data.countryCode || 'ID'}`;
            }
          }
        } catch (e) {
          console.warn('Reverse geocode failed, fallback to lat/lon name');
        }

        saveLocationToStorage(newLoc);
        setLocation(newLoc);
        setGpsLoading(false);
        setSuccessMessage('Berhasil mendeteksi lokasi GPS kebun!');
        setTimeout(() => setIsModalOpen(false), 1200);
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Izin GPS ditolak oleh browser. Mohon izinkan akses lokasi.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage('Sinyal GPS tidak tersedia saat ini.');
        } else {
          setErrorMessage('Gagal mengambil lokasi GPS device.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle Manual City Search
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await searchCityCoordinates(searchQuery.trim());
    setSearchLoading(false);

    if (result) {
      const newLoc: SavedLocation = {
        name: result.name,
        lat: result.lat,
        lon: result.lon,
        isGps: false,
      };

      saveLocationToStorage(newLoc);
      setLocation(newLoc);
      setSuccessMessage(`Lokasi kebun diubah ke: ${result.name}`);
      setSearchQuery('');
      setTimeout(() => setIsModalOpen(false), 1200);
    } else {
      setErrorMessage(`Lokasi "${searchQuery}" tidak ditemukan. Coba ketik nama kota/kecamatan lain.`);
    }
  };

  // Helper for Weather Icon
  const renderWeatherIcon = (iconType?: WeatherData['icon']) => {
    switch (iconType) {
      case 'clear':
        return <Sun className="w-8 h-8 text-[#E9B949] animate-spin-slow" />;
      case 'partly-cloudy':
        return <CloudSun className="w-8 h-8 text-[#48A9A6]" />;
      case 'cloudy':
        return <Cloud className="w-8 h-8 text-[#5C7D8D]" />;
      case 'rain':
        return <CloudRain className="w-8 h-8 text-[#305664]" />;
      case 'thunderstorm':
        return <CloudLightning className="w-8 h-8 text-[#D9534F]" />;
      default:
        return <CloudSun className="w-8 h-8 text-[#305664]" />;
    }
  };

  return (
    <>
      {/* WEATHER CARD ON HOME PAGE */}
      <div className="bg-gradient-to-br from-[#1F3D47] to-[#305664] text-white rounded-2xl p-4 shadow-sm border border-[#3E6B7A] space-y-3 relative overflow-hidden">
        {/* Subtle Decorative Gradient Blur Background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#48A9A6]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Card Header: Location & Modal Toggle Button */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 max-w-[70%]">
            <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center text-[#B8EAD7] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white truncate font-hanken">
                  {location.name}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-[#B8EAD7] shrink-0">
                  {location.isGps ? 'GPS' : 'Manual'}
                </span>
              </div>
              <p className="text-[10px] text-[#C2E0D8]">Cuaca Kebun Real-Time</p>
            </div>
          </div>

          <button
            onClick={() => {
              setErrorMessage(null);
              setSuccessMessage(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl backdrop-blur-sm border border-white/20 transition-all cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-[#B8EAD7]" />
            <span>Ubah Lokasi</span>
          </button>
        </div>

        {/* Main Weather Information */}
        {loading ? (
          <div className="flex items-center justify-center py-4 text-xs text-[#C2E0D8] gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#B8EAD7]" />
            <span>Memuat data cuaca kebun...</span>
          </div>
        ) : weather ? (
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between bg-black/15 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                {renderWeatherIcon(weather.icon)}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white font-hanken">
                      {weather.temperature}°C
                    </span>
                    <span className="text-xs font-semibold text-[#B8EAD7]">
                      ({weather.condition})
                    </span>
                  </div>
                  <p className="text-[10px] text-white/70">Perkiraan Hujan: {weather.rainProbability}%</p>
                </div>
              </div>

              {/* Extra Metrics: Humidity & Wind */}
              <div className="flex gap-3 text-right">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-end gap-1 text-[10px] text-[#B8EAD7]">
                    <Droplets className="w-3 h-3" />
                    <span>Lembab</span>
                  </div>
                  <p className="text-xs font-bold text-white">{weather.humidity}%</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-end gap-1 text-[10px] text-[#B8EAD7]">
                    <Wind className="w-3 h-3" />
                    <span>Angin</span>
                  </div>
                  <p className="text-xs font-bold text-white">{weather.windSpeed} km/h</p>
                </div>
              </div>
            </div>

            {/* Smart Farming Advisory Banner */}
            <div className="flex items-start gap-2 bg-[#2D4F5A]/80 border border-[#48A9A6]/40 p-2.5 rounded-xl text-[11px] text-[#E0F2FE]">
              <Sparkles className="w-4 h-4 text-[#FDE047] shrink-0 mt-0.5" />
              <p className="leading-snug">{weather.advisory}</p>
            </div>
          </div>
        ) : (
          <div className="text-xs text-white/70 py-2">Gagal memuat data cuaca.</div>
        )}
      </div>

      {/* MODAL SETTINGS LOKASI KEBUN (GPS OR MANUAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-[#E1E3E2] relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E1E3E2] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#305664] flex items-center justify-center text-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#191C1C] font-hanken">Pengaturan Lokasi Kebun</h3>
                  <p className="text-[11px] text-[#41484B]">Pilih metode input lokasi untuk cuaca real-time</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F2F4F3] hover:bg-[#E5E8E6] flex items-center justify-center text-[#41484B] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback Notifications */}
            {errorMessage && (
              <div className="flex items-center gap-2 bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-2 bg-[#D1FAE5] border border-[#6EE7B7] text-[#065F46] text-xs p-3 rounded-xl">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* OPTION 1: DETEKSI GPS AUTOMATIC */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#191C1C] block">Opsi 1: Lokasi Otomatis via GPS Device</label>
              <button
                type="button"
                onClick={handleUseGps}
                disabled={gpsLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#305664] hover:bg-[#254450] active:scale-98 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {gpsLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#B8EAD7]" />
                    <span>Mendapatkan Koordinat GPS...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4 text-[#B8EAD7]" />
                    <span>Gunakan GPS Saya Saat Ini</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-[#E1E3E2] flex-1" />
              <span className="text-[10px] font-bold text-[#71787D] uppercase">Atau</span>
              <div className="h-px bg-[#E1E3E2] flex-1" />
            </div>

            {/* OPTION 2: INPUT MANUAL NAMA KOTA / KECAMATAN */}
            <form onSubmit={handleManualSearch} className="space-y-2">
              <label className="text-xs font-bold text-[#191C1C] block">Opsi 2: Input Manual Nama Daerah / Kota Kebun</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik kota/kecamatan (contoh: Indralaya, Palembang, Malang)..."
                    className="w-full bg-[#F8FAF9] border border-[#C1C7C5] rounded-xl px-3 py-2 text-xs text-[#191C1C] focus:outline-none focus:border-[#305664] focus:ring-1 focus:ring-[#305664]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading || !searchQuery.trim()}
                  className="bg-[#2E5C4D] hover:bg-[#23483C] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {searchLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Cari</span>
                </button>
              </div>
            </form>

            <div className="bg-[#F2F4F3] p-2.5 rounded-xl border border-[#E1E3E2] text-[11px] text-[#41484B]">
              <span className="font-bold text-[#191C1C]">Info:</span> Lokasi yang dipilih akan tersimpan di browser Anda untuk pembaruan cuaca otomatis setiap saat.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

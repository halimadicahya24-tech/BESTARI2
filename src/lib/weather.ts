// src/lib/weather.ts

export interface WeatherData {
  locationName: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  advisory: string;
  lat: number;
  lon: number;
  icon: 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'thunderstorm';
}

export interface SavedLocation {
  name: string;
  lat: number;
  lon: number;
  isGps: boolean;
}

const STORAGE_KEY = 'bestari_farm_location';

// Default Location: Indralaya, Ogan Ilir, Sumatera Selatan
export const DEFAULT_LOCATION: SavedLocation = {
  name: 'Indralaya, Ogan Ilir',
  lat: -3.2263,
  lon: 104.6469,
  isGps: false,
};

export const getSavedLocation = (): SavedLocation => {
  if (typeof window === 'undefined') return DEFAULT_LOCATION;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Gagal membaca saved location:', e);
  }
  return DEFAULT_LOCATION;
};

export const saveLocationToStorage = (location: SavedLocation) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch (e) {
    console.warn('Gagal menyimpan location:', e);
  }
};

// Generates smart advisory for farmers based on weather condition & temperature
const generateAdvisory = (condition: string, temp: number, humidity: number): string => {
  const condLower = condition.toLowerCase();
  if (condLower.includes('hujan') || condLower.includes('rain')) {
    return '🌧️ Hujan terdeteksi. Tunda penyiraman tanah & hindari semprot biopestisida agar tidak larut.';
  }
  if (temp > 33) {
    return '☀️ Suhu tinggi & terik. Disarankan penyiraman tanah otomatis untuk menjaga kelembaban akar.';
  }
  if (humidity > 85) {
    return '💧 Kelembaban tinggi. Pantau potensi jamur & serangan Ulat Grayak pada daun jagung.';
  }
  return '🌱 Kondisi cuaca ideal! Sangat baik untuk pemantauan rutin & penyemprotan biopesticide.';
};

// Maps weather codes to condition string & icon
const mapWmoCodeToCondition = (code: number): { condition: string; icon: WeatherData['icon'] } => {
  if (code === 0) return { condition: 'Cerah', icon: 'clear' };
  if (code === 1 || code === 2) return { condition: 'Cerah Berawan', icon: 'partly-cloudy' };
  if (code === 3) return { condition: 'Berawan', icon: 'cloudy' };
  if (code >= 51 && code <= 67) return { condition: 'Hujan Ringan', icon: 'rain' };
  if (code >= 80 && code <= 82) return { condition: 'Hujan Deras', icon: 'rain' };
  if (code >= 95) return { condition: 'Badai Petir', icon: 'thunderstorm' };
  return { condition: 'Berawan', icon: 'cloudy' };
};

// Map OpenWeatherMap icon code / weather main
const mapOwmCondition = (main: string, desc: string): { condition: string; icon: WeatherData['icon'] } => {
  const m = main.toLowerCase();
  if (m.includes('clear')) return { condition: 'Cerah', icon: 'clear' };
  if (m.includes('clouds')) {
    return desc.includes('few') || desc.includes('scattered')
      ? { condition: 'Cerah Berawan', icon: 'partly-cloudy' }
      : { condition: 'Berawan Lengkap', icon: 'cloudy' };
  }
  if (m.includes('rain') || m.includes('drizzle')) return { condition: 'Hujan', icon: 'rain' };
  if (m.includes('thunderstorm')) return { condition: 'Badai Petir', icon: 'thunderstorm' };
  return { condition: desc || 'Cerah Berawan', icon: 'partly-cloudy' };
};

// Primary Weather Fetch Function
export const fetchWeatherData = async (lat: number, lon: number, locationNameOverride?: string): Promise<WeatherData> => {
  const owmApiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

  // Option A: If OpenWeatherMap API Key is configured
  if (owmApiKey && owmApiKey !== 'YOUR_API_KEY_HERE') {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=id&appid=${owmApiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const condInfo = mapOwmCondition(data.weather[0]?.main || '', data.weather[0]?.description || '');
        const temp = Math.round(data.main.temp);
        const humidity = data.main.humidity;
        const windSpeed = Math.round((data.wind.speed || 0) * 3.6); // m/s to km/h
        const name = locationNameOverride || `${data.name}, ${data.sys?.country || 'ID'}`;

        return {
          locationName: name,
          temperature: temp,
          condition: condInfo.condition,
          humidity: humidity,
          windSpeed: windSpeed,
          rainProbability: data.rain ? 80 : 15,
          advisory: generateAdvisory(condInfo.condition, temp, humidity),
          lat,
          lon,
          icon: condInfo.icon,
        };
      }
    } catch (e) {
      console.warn('OpenWeatherMap fetch error, fallback ke Open-Meteo:', e);
    }
  }

  // Option B: Open-Meteo Free API Fallback (No API key needed!)
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`
    );
    if (res.ok) {
      const data = await res.json();
      const current = data.current_weather;
      const condInfo = mapWmoCodeToCondition(current.weathercode);
      const temp = Math.round(current.temperature);
      const windSpeed = Math.round(current.windspeed);
      const humidity = data.hourly?.relativehumidity_2m?.[0] || 75;

      return {
        locationName: locationNameOverride || `Lokasi (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
        temperature: temp,
        condition: condInfo.condition,
        humidity: humidity,
        windSpeed: windSpeed,
        rainProbability: condInfo.icon === 'rain' ? 85 : 15,
        advisory: generateAdvisory(condInfo.condition, temp, humidity),
        lat,
        lon,
        icon: condInfo.icon,
      };
    }
  } catch (e) {
    console.warn('Open-Meteo fetch error, fallback ke default mock data:', e);
  }

  // Option C: Hard Fallback Mock Data if network offline
  return {
    locationName: locationNameOverride || 'Indralaya, Ogan Ilir',
    temperature: 29,
    condition: 'Cerah Berawan',
    humidity: 76,
    windSpeed: 12,
    rainProbability: 20,
    advisory: '🌱 Kondisi cuaca ideal! Sangat baik untuk pemantauan rutin & penyemprotan biopesticide.',
    lat,
    lon,
    icon: 'partly-cloudy',
  };
};

// Reverse Geocoding: Search city coordinates by query text
export const searchCityCoordinates = async (query: string): Promise<{ name: string; lat: number; lon: number } | null> => {
  const owmApiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

  if (owmApiKey && owmApiKey !== 'YOUR_API_KEY_HERE') {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${owmApiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const item = data[0];
          const name = item.state ? `${item.name}, ${item.state}` : `${item.name}, ${item.country}`;
          return { name, lat: item.lat, lon: item.lon };
        }
      }
    } catch (e) {
      console.warn('OWM Geocoding error, fallback ke Open-Meteo Nominatim:', e);
    }
  }

  // Fallback Geocoding with Open-Meteo / Nominatim
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=id&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const name = item.admin1 ? `${item.name}, ${item.admin1}` : item.name;
        return { name, lat: item.latitude, lon: item.longitude };
      }
    }
  } catch (e) {
    console.warn('Geocoding search failed:', e);
  }

  return null;
};

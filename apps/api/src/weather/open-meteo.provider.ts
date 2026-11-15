import { Injectable, Logger } from '@nestjs/common';
import type { Place, Weather } from '@hdp/shared';
import { fetchJson } from '../common/http.js';

/**
 * Open-Meteo: tiempo y geocodificación gratis y sin clave (uso no comercial, máx. 10.000 llamadas/día).
 * Licencia de datos CC BY 4.0: la app muestra "Datos del tiempo: Open-Meteo.com".
 */

type ForecastResponse = {
  timezone?: string;
  current?: { time: string; temperature_2m: number; relative_humidity_2m: number; weather_code: number; is_day: number };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    uv_index_max: number[];
    weather_code: number[];
  };
};

type GeocodingResponse = {
  results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string }[];
};

@Injectable()
export class OpenMeteoProvider {
  private readonly logger = new Logger(OpenMeteoProvider.name);

  async forecast(lat: number, lon: number): Promise<{ weather: Omit<Weather, 'place'>; timezone: string | null } | null> {
    const params = new URLSearchParams({
      latitude: lat.toFixed(2),
      longitude: lon.toFixed(2),
      current: 'temperature_2m,relative_humidity_2m,weather_code,is_day',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,weather_code',
      timezone: 'auto',
      forecast_days: '8',
    });
    const data = await fetchJson<ForecastResponse>(`https://api.open-meteo.com/v1/forecast?${params}`, {}, 6000);
    if (!data?.current || !data.daily) {
      this.logger.warn(`Open-Meteo no respondió para ${lat},${lon}`);
      return null;
    }
    const d = data.daily;
    return {
      timezone: data.timezone ?? null,
      weather: {
        fetchedAt: new Date().toISOString(),
        current: {
          tempC: data.current.temperature_2m,
          humidityPct: data.current.relative_humidity_2m,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
        },
        days: d.time.map((day, i) => ({
          day,
          minC: d.temperature_2m_min[i] ?? 0,
          maxC: d.temperature_2m_max[i] ?? 0,
          rainMm: d.precipitation_sum[i] ?? 0,
          uvMax: d.uv_index_max[i] ?? 0,
          weatherCode: d.weather_code[i] ?? 0,
        })),
      },
    };
  }

  async searchPlaces(query: string): Promise<Place[]> {
    const params = new URLSearchParams({ name: query, count: '8', language: 'es', format: 'json' });
    const data = await fetchJson<GeocodingResponse>(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {}, 5000);
    return (data?.results ?? []).map((r) => ({
      name: r.name,
      region: r.admin1 ?? null,
      country: r.country ?? null,
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone ?? null,
    }));
  }
}

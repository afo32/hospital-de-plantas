import { weatherSchema, type Weather } from '@hdp/shared';
import { z } from 'zod';
import { api } from './api';
import { type Cached, withCache } from './offline';

const responseSchema = z.object({ weather: weatherSchema.nullable() });

export function getWeather(): Promise<Cached<Weather | null>> {
  return withCache('weather', async () => responseSchema.parse(await api('/weather')).weather);
}

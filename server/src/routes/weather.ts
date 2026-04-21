import axios from 'axios';
import { Router, Request, Response } from 'express';
import { getSetting } from './settings.js';

const router = Router();

// Pirate Weather uses Dark Sky-compatible API
// Single call returns both current conditions and daily forecast
async function fetchPirateWeather(apiKey: string, lat: string, lon: string, units: string) {
  const pwUnits = units === 'metric' ? 'si' : 'us';
  const r = await axios.get(`https://api.pirateweather.net/forecast/${apiKey}/${lat},${lon}`, {
    params: { units: pwUnits, exclude: 'minutely,hourly,alerts' },
  });
  return r.data;
}

// GET /api/weather/current
router.get('/current', async (_req: Request, res: Response) => {
  const apiKey = getSetting('pirateweather_api_key');
  const lat = getSetting('weather_lat');
  const lon = getSetting('weather_lon');
  const units = getSetting('weather_units') ?? 'imperial';

  if (!apiKey || !lat || !lon) {
    return res.status(503).json({ success: false, error: 'Weather not configured' });
  }

  try {
    const d = await fetchPirateWeather(apiKey, lat, lon, units);
    const c = d.currently;
    res.json({
      success: true,
      data: {
        temp: c.temperature,
        humidity: Math.round(c.humidity * 100),
        windSpeed: c.windSpeed,
        icon: c.icon,
        description: c.summary ?? '',
        dt: c.time,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/weather/forecast — daily data from same Pirate Weather call
router.get('/forecast', async (_req: Request, res: Response) => {
  const apiKey = getSetting('pirateweather_api_key');
  const lat = getSetting('weather_lat');
  const lon = getSetting('weather_lon');
  const units = getSetting('weather_units') ?? 'imperial';

  if (!apiKey || !lat || !lon) {
    return res.status(503).json({ success: false, error: 'Weather not configured' });
  }

  try {
    const d = await fetchPirateWeather(apiKey, lat, lon, units);
    const list = (d.daily?.data ?? []).map((day: any) => ({
      dt: day.time,
      temp_min: day.temperatureMin,
      temp_max: day.temperatureMax,
      icon: day.icon,
      description: day.summary ?? '',
    }));
    res.json({ success: true, data: { list } });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;

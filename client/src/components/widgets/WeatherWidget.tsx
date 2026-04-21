import React from 'react';
import { Wind, Droplets } from 'lucide-react';
import { format, fromUnixTime } from 'date-fns';
import { useWeather, useWeatherForecast } from '../../hooks/useWeather';
import { useWidgetSetting } from '../dashboard/WidgetConfigContext';
import LoadingSpinner from '../common/LoadingSpinner';

// Pirate Weather / Dark Sky icon strings → Material Symbols Rounded
function pwIconToMaterial(icon: string | null): string {
  switch (icon) {
    case 'clear-day':           return 'sunny';
    case 'clear-night':         return 'clear_night';
    case 'partly-cloudy-day':   return 'partly_cloudy_day';
    case 'partly-cloudy-night': return 'partly_cloudy_night';
    case 'cloudy':              return 'cloudy';
    case 'rain':
    case 'drizzle':             return 'rainy';
    case 'snow':
    case 'sleet':               return 'weather_snowy';
    case 'wind':                return 'air';
    case 'fog':                 return 'foggy';
    case 'thunderstorm':        return 'thunderstorm';
    default:                    return 'partly_cloudy_day';
  }
}

function pwIconColor(icon: string | null): string {
  switch (icon) {
    case 'clear-day':           return '#FBBF24';
    case 'clear-night':         return '#93C5FD';
    case 'partly-cloudy-day':   return '#FCD34D';
    case 'partly-cloudy-night': return '#93C5FD';
    case 'cloudy':              return '#64748B';
    case 'rain':
    case 'drizzle':             return '#60A5FA';
    case 'snow':
    case 'sleet':               return '#BAE6FD';
    case 'wind':
    case 'fog':                 return '#94A3B8';
    case 'thunderstorm':        return '#A78BFA';
    default:                    return '#94A3B8';
  }
}

function WeatherIcon({ icon, size = 32 }: { icon: string | null; size?: number }) {
  return (
    <span
      className="material-symbols-rounded select-none leading-none"
      style={{ fontSize: size, color: pwIconColor(icon) }}
    >
      {pwIconToMaterial(icon)}
    </span>
  );
}

type DailyEntry = { dt: number; temp_min: number | null; temp_max: number | null; icon: string | null; description: string };

function DailyForecast({ item }: { item: DailyEntry }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
      <span className="text-[10px] text-slate-400">{format(fromUnixTime(item.dt), 'EEE')}</span>
      <WeatherIcon icon={item.icon} size={24} />
      <span className="text-xs font-semibold text-slate-200">{item.temp_max != null ? Math.round(item.temp_max) : '—'}°</span>
      <span className="text-[10px] text-slate-500">{item.temp_min != null ? Math.round(item.temp_min) : '—'}°</span>
    </div>
  );
}

export default function WeatherWidget() {
  const { data: current, isLoading } = useWeather();
  const { data: forecast } = useWeatherForecast();
  const forecastDays = useWidgetSetting<number>('forecastDays', 5);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-slate-500">Weather not configured</p>
      </div>
    );
  }

  // Today entry uses live current temp; today's min/max from daily forecast
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const forecastList: DailyEntry[] = forecast?.list ?? [];

  const todayForecast = forecastList.find(
    item => format(fromUnixTime(item.dt), 'yyyy-MM-dd') === todayStr
  );

  const todayEntry: DailyEntry = {
    dt: current.dt,
    temp_min: todayForecast?.temp_min ?? null,
    temp_max: todayForecast?.temp_max ?? null,
    icon: current.icon,
    description: current.description,
  };

  const futureDays = forecastList
    .filter(item => format(fromUnixTime(item.dt), 'yyyy-MM-dd') !== todayStr)
    .slice(0, forecastDays - 1);

  const daily = [todayEntry, ...futureDays];

  const temp = Math.round(current.temp);
  const todayHigh = todayEntry.temp_max != null ? Math.round(todayEntry.temp_max) : null;
  const todayLow = todayEntry.temp_min != null ? Math.round(todayEntry.temp_min) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Current */}
      <div className="flex items-center gap-3 px-3 py-2 flex-1">
        <div className="flex flex-col items-center shrink-0">
          <WeatherIcon icon={current.icon} size={40} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-1.5">
            <span className="text-4xl font-bold text-slate-100 leading-none">{temp}°</span>
            {todayHigh != null && todayLow != null && (
              <span className="text-xs text-slate-400 pb-1">H:{todayHigh}° L:{todayLow}°</span>
            )}
          </div>
          {current.description && (
            <p className="text-xs text-slate-300 capitalize mt-0.5">{current.description}</p>
          )}
          <div className="flex gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Droplets className="w-3 h-3" /> {current.humidity}%
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Wind className="w-3 h-3" /> {Math.round(current.windSpeed)} mph
            </span>
          </div>
        </div>
      </div>

      {/* Forecast */}
      {daily.length > 0 && (
        <div className="flex border-t border-slate-700/50 px-2 pb-2">
          {daily.map(item => (
            <DailyForecast key={item.dt} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

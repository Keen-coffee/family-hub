import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '../api/weather';

export function useWeather() {
  return useQuery({
    queryKey: ['weather-current'],
    queryFn: () => weatherApi.getCurrent(),
    select: d => d.data,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 0,
  });
}

export function useWeatherForecast() {
  return useQuery({
    queryKey: ['weather-forecast'],
    queryFn: () => weatherApi.getForecast(),
    select: d => d.data,
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
}

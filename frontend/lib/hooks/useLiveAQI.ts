import { useState, useEffect } from 'react';

export interface LiveReading {
  aqi: number;
  dominant: string;
  time: string;
  station: string;
}

export function useLiveAQI(token = "demo") {
  const [readings, setReadings] = useState<Record<string, LiveReading>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  useEffect(() => {
    async function fetchAll() {
      try {
        // Try Pune city station first (most reliable)
        const res = await fetch(
          `https://api.waqi.info/feed/pune/?token=${token}`
        );
        const data = await res.json();
        if (data.status === "ok") {
          setReadings({ "Pune": {
            aqi: data.data.aqi,
            dominant: data.data.dominentpol,
            time: data.data.time.s,
            station: data.data.city.name,
          }});
          setIsLive(true);
          setLastUpdated(new Date());
        } else {
          setIsLive(false);
        }
      } catch {
        setIsLive(false);
      }
    }
    
    fetchAll();
    const interval = setInterval(fetchAll, 15 * 60 * 1000); // every 15 min
    return () => clearInterval(interval);
  }, [token]);
  
  return { readings, lastUpdated, isLive };
}

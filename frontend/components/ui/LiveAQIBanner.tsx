'use client';

import React from 'react';
import { useLiveAQI } from '@/lib/hooks/useLiveAQI';

export default function LiveAQIBanner() {
  const { readings, isLive, lastUpdated } = useLiveAQI();

  if (!isLive || !readings["Pune"]) {
    return null; // Silent graceful degradation — no error, no broken banner
  }

  const reading = readings["Pune"];

  // AQI category + theme-aware color var for the live feed
  const getAQIInfo = (aqi: number) => {
    if (aqi <= 50) return { category: 'Good', color: 'bg-[var(--aqi-good)]' };
    if (aqi <= 100) return { category: 'Satisfactory', color: 'bg-[var(--aqi-satisfactory)]' };
    if (aqi <= 200) return { category: 'Moderate', color: 'bg-[var(--aqi-moderate)]' };
    if (aqi <= 300) return { category: 'Poor', color: 'bg-[var(--aqi-poor)]' };
    if (aqi <= 400) return { category: 'Very Poor', color: 'bg-[var(--aqi-very-poor)]' };
    return { category: 'Severe', color: 'bg-[var(--aqi-severe)]' };
  };

  const info = getAQIInfo(reading.aqi);

  const timeString = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="w-full bg-[var(--teal-soft)] border border-[var(--teal)] rounded-xl p-4 mb-8 relative group">
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${info.color} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${info.color}`}></span>
          </span>
          <p className="text-[var(--text-primary)] font-medium">
            LIVE — Pune AQI right now: <span className="font-bold">{reading.aqi}</span> ({info.category})
          </p>
        </div>
        <div className="text-[var(--text-muted)] text-sm mt-2 sm:mt-0 flex gap-4">
          <span>Dominant: {reading.dominant.toUpperCase()}</span>
          <span>&middot;</span>
          <span>Updated {timeString}</span>
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded shadow-xl text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        Real-time reading from AQICN/CPCB network.
        Index scores use validated 2024–25 seasonal means from 9 stations.
        Live reading shows today&apos;s current conditions.
      </div>
    </div>
  );
}

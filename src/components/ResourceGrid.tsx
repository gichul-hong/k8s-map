'use client';

import React from 'react';

interface ResourceGridProps {
  percentage: number;
  total: number;
  label: string;
}

const ResourceGrid: React.FC<ResourceGridProps> = ({ percentage, total, label }) => {
  if (total === 0) {
    return null; // Don't render anything if there's no capacity
  }

  const filledCells = Math.round((percentage / 100) * total);

  const getHeatmapColor = (percent: number) => {
    const r = Math.floor(percent * 2.55);
    const g = Math.floor((100 - percent) * 2.55);
    return `rgb(${r}, ${g}, 0)`;
  };
  
  const cellColor = getHeatmapColor(percentage);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{percentage.toFixed(0)}%</span>
      </div>
      <div
        className="grid gap-1 w-full"
        style={{ gridTemplateColumns: `repeat(${Math.min(total, 10)}, 1fr)` }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="w-full h-3 rounded-sm"
            style={{ 
              backgroundColor: i < filledCells ? cellColor : '#e0e0e0',
              border: '1px solid #c0c0c0'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ResourceGrid;
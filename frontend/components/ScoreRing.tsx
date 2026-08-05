"use client";

import { motion } from "framer-motion";

interface ScoreRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showPercent?: boolean;
}

export default function ScoreRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = "#F97316",
  bgColor = "#FFF7ED",
  showPercent = true
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * value) / 100;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Foreground circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      {showPercent && (
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black text-dark-text">{value}%</span>
          <span className="text-[10px] font-bold text-secondary-text uppercase">Score</span>
        </div>
      )}
    </div>
  );
}

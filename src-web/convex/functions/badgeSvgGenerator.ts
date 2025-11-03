import type { BadgeTier } from "../models/badges.ts";

export function generateBadgeSVG(
  icon: string,
  tier: BadgeTier,
): string {
  const colors = {
    bronze: { main: "#FF6B35", light: "#FF8C42", dark: "#E55100" },
    silver: { main: "#00D9FF", light: "#33E9FF", dark: "#0099CC" },
    gold: { main: "#FFD93D", light: "#FFED4E", dark: "#FFA500" },
  };

  const c = colors[tier];

  return `
    <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.light};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${c.main};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${c.dark};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.3" />
        </filter>
        <filter id="innerShadow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      <!-- Hexagon shape -->
      <polygon points="100,20 170,60 170,140 100,180 30,140 30,60"
        fill="url(#metalGrad)"
        stroke="${c.dark}"
        stroke-width="2"
        filter="url(#shadow)"/>

      <!-- Inner highlight edge -->
      <polygon points="100,25 165,60 165,140 100,175 35,140 35,60"
        fill="none"
        stroke="${c.light}"
        stroke-width="1"
        opacity="0.6"/>

      <!-- Icon -->
      <text x="100" y="110" font-size="90" text-anchor="middle" dominant-baseline="central">
        ${icon}
      </text>
    </svg>
  `;
}

export function getBadgeSVGDataUrl(icon: string, tier: BadgeTier): string {
  const svg = generateBadgeSVG(icon, tier);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

import React from "react";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

/**
 * Icônes SVG inline (style Lucide) : aucun chargement de police,
 * donc plus de carrés cassés (web comme mobile).
 */
const ICONS = {
  menu: [
    { t: "path", d: "M4 6h16" },
    { t: "path", d: "M4 12h16" },
    { t: "path", d: "M4 18h16" },
  ],
  home: [
    { t: "path", d: "m3 9.5 9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    { t: "path", d: "M9 22v-8h6v8" },
  ],
  wallet: [
    { t: "rect", x: 3, y: 6, w: 18, h: 13, rx: 2 },
    { t: "path", d: "M3 10h18" },
    { t: "path", d: "M16 14.5h3" },
  ],
  dollar: [
    { t: "path", d: "M12 2v20" },
    { t: "path", d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  ],
  user: [
    { t: "path", d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" },
    { t: "circle", cx: 12, cy: 7, r: 4 },
  ],
  globe: [
    { t: "circle", cx: 12, cy: 12, r: 10 },
    { t: "path", d: "M2 12h20" },
    { t: "path", d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" },
  ],
  bike: [
    { t: "circle", cx: 5.5, cy: 17.5, r: 3.5 },
    { t: "circle", cx: 18.5, cy: 17.5, r: 3.5 },
    { t: "path", d: "M15 6h-3l-2 4" },
    { t: "path", d: "M12 17.5V14l-3-3 4-3 2 3h3" },
  ],
  clock: [
    { t: "circle", cx: 12, cy: 12, r: 10 },
    { t: "path", d: "M12 6v6l4 2" },
  ],
  card: [
    { t: "rect", x: 2, y: 5, w: 20, h: 14, rx: 2 },
    { t: "path", d: "M2 10h20" },
  ],
  help: [
    { t: "circle", cx: 12, cy: 12, r: 10 },
    { t: "path", d: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" },
    { t: "path", d: "M12 17h.01" },
  ],
  info: [
    { t: "circle", cx: 12, cy: 12, r: 10 },
    { t: "path", d: "M12 16v-4" },
    { t: "path", d: "M12 8h.01" },
  ],
  shield: [{ t: "path", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }],
  package: [
    { t: "path", d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
    { t: "path", d: "m3.3 7 8.7 5 8.7-5" },
    { t: "path", d: "M12 22V12" },
  ],
  logout: [
    { t: "path", d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" },
    { t: "path", d: "m16 17 5-5-5-5" },
    { t: "path", d: "M21 12H9" },
  ],
  chevronRight: [{ t: "path", d: "m9 18 6-6-6-6" }],
  close: [
    { t: "path", d: "M18 6 6 18" },
    { t: "path", d: "m6 6 12 12" },
  ],
  refresh: [
    { t: "path", d: "M3 12a9 9 0 0 1 9-9 9.7 9.7 0 0 1 6.7 2.7L21 8" },
    { t: "path", d: "M21 3v5h-5" },
    { t: "path", d: "M21 12a9 9 0 0 1-9 9 9.7 9.7 0 0 1-6.7-2.7L3 16" },
    { t: "path", d: "M8 16H3v5" },
  ],
  check: [
    { t: "circle", cx: 12, cy: 12, r: 10 },
    { t: "path", d: "m9 12 2 2 4-4" },
  ],
  truck: [
    { t: "path", d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" },
    { t: "path", d: "M15 18H9" },
    { t: "path", d: "M19 18h2a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.2-.6l-3.5-4.4A1 1 0 0 0 17.5 8H14" },
    { t: "circle", cx: 17, cy: 18, r: 2 },
    { t: "circle", cx: 7, cy: 18, r: 2 },
  ],
  pin: [
    { t: "path", d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" },
    { t: "circle", cx: 12, cy: 10, r: 3 },
  ],
  phone: [
    {
      t: "path",
      d: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
    },
  ],
  trend: [
    { t: "path", d: "M22 7 13.5 15.5 8.5 10.5 2 17" },
    { t: "path", d: "M16 7h6v6" },
  ],
};

export default function Icon({ name, size = 22, color = "#1D1D1D", strokeWidth = 2, style }) {
  const shapes = ICONS[name] || ICONS.help;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {shapes.map((s, i) => {
        if (s.t === "path") return <Path key={i} d={s.d} />;
        if (s.t === "circle") return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} />;
        if (s.t === "rect") return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} />;
        if (s.t === "line") return <Line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
        return null;
      })}
    </Svg>
  );
}

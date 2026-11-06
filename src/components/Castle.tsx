import type { RoleClass } from "@/lib/types";

interface Props {
  level: number;
  stability: number;
  hpPct: number;
  doneByRole: Record<RoleClass, number>;
}

const BRASS = "#ff6b1a";
const PAPER = "#e4ebf0";
const DIM = "#5f7485";
const LINE = "#2c3b48";

function Tower({ x, y, h = 70, w = 34, roof = true, stroke = PAPER }: { x: number; y: number; h?: number; w?: number; roof?: boolean; stroke?: string }) {
  return (
    <g stroke={stroke} strokeWidth={1.6} fill="#131b22" strokeLinejoin="round">
      <rect x={x - w / 2} y={y - h} width={w} height={h} />
      {roof ? (
        <path d={`M${x - w / 2 - 5} ${y - h} L${x} ${y - h - 28} L${x + w / 2 + 5} ${y - h} Z`} fill="#1b2630" />
      ) : (
        <path d={`M${x - w / 2} ${y - h} h6 v-7 h6 v7 h6 v-7 h6 v7 h${w - 24}`} fill="none" />
      )}
      <rect x={x - 3} y={y - h + 16} width={6} height={14} fill={BRASS} stroke="none" opacity={0.85} />
    </g>
  );
}

export function Castle({ level, stability, hpPct, doneByRole }: Props) {
  const foggy = stability < 50;
  const cracked = hpPct < 50;
  const arch = Math.min(doneByRole.ARCHITECT, 3);
  const rng = Math.min(doneByRole.RANGER, 3);
  const smith = Math.min(doneByRole.BLACKSMITH, 3);
  const wallH = 52 + smith * 8;

  return (
    <svg viewBox="0 0 640 380" role="img" aria-label={`Kale seviye ${level}`} className="h-auto w-full">
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={LINE} strokeWidth="1" />
        </pattern>
        <filter id="fogblur" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* zemin */}
      <ellipse cx="320" cy="318" rx="290" ry="42" fill="url(#hatch)" stroke={LINE} />
      <ellipse cx="320" cy="312" rx="250" ry="30" fill="#131b22" stroke={LINE} />

      {level === 1 && (
        <g stroke={PAPER} strokeWidth="1.6" fill="#1b2630" strokeLinejoin="round">
          <path d="M250 312 L320 214 L390 312 Z" />
          <path d="M320 214 L320 312" stroke={DIM} />
          <path d="M295 312 L320 268 L345 312 Z" fill="#0d1217" />
          <path d="M320 214 v-26 l22 8 l-22 8" stroke={BRASS} fill={BRASS} />
          <path d="M175 312 L215 258 L255 312 Z" />
          <path d="M385 312 L425 266 L465 312 Z" />
        </g>
      )}

      {level >= 2 && (
        <g stroke={PAPER} strokeWidth="1.6" strokeLinejoin="round" fill="#1b2630">
          {/* sur */}
          <rect x="170" y={312 - wallH} width="300" height={wallH} fill={level >= 3 ? "#223040" : "#2e2422"} />
          {Array.from({ length: 15 }).map((_, i) => (
            <line key={i} x1={185 + i * 20} y1={312 - wallH} x2={185 + i * 20} y2={312} stroke={level >= 3 ? LINE : "#5a3826"} />
          ))}
          <path d={`M170 ${312 - wallH} ${Array.from({ length: 15 }, () => "h10 v-8 h10 v8").join(" ")}`} fill="none" />
          {/* kapı */}
          <path d="M300 312 v-34 a20 20 0 0 1 40 0 v34 z" fill="#0d1217" />
          <path d="M320 258 v54" stroke={BRASS} />
        </g>
      )}

      {level >= 2 && <Tower x={170} y={312} h={wallH + 22} roof={level < 3} />}
      {level >= 2 && <Tower x={470} y={312} h={wallH + 22} roof={level < 3} />}
      {level >= 3 && <Tower x={320} y={300 - wallH + 12} h={78} w={56} roof />}
      {rng >= 1 && level >= 2 && <Tower x={245} y={312} h={wallH + 16 + rng * 6} w={26} roof={false} />}
      {rng >= 2 && level >= 2 && <Tower x={395} y={312} h={wallH + 16 + rng * 6} w={26} roof={false} />}

      {/* sancaklar (Mimar) */}
      {level >= 2 &&
        Array.from({ length: arch }).map((_, i) => {
          const x = 205 + i * 115;
          const top = 312 - wallH - 46;
          return (
            <g key={i}>
              <line x1={x} y1={top + 46} x2={x} y2={top} stroke={PAPER} strokeWidth="1.6" />
              <path d={`M${x} ${top} h26 l-8 9 l8 9 h-26 z`} fill={BRASS} stroke="none" opacity="0.9" />
            </g>
          );
        })}

      {/* büyülü kubbe */}
      {level >= 4 && (
        <g fill="none" stroke={BRASS} strokeWidth="1.4">
          <path d="M150 312 A170 190 0 0 1 490 312" strokeDasharray="3 6" />
          <path d="M175 312 A145 160 0 0 1 465 312" opacity="0.5" />
          <path d="M320 122 v-22 M310 108 l10 -14 l10 14" />
        </g>
      )}

      {/* çatlaklar */}
      {cracked && level >= 2 && (
        <g stroke="#0d1217" strokeWidth="2.2" fill="none">
          <path d={`M230 ${312 - wallH} l8 14 l-6 10 l10 16`} />
          <path d={`M410 ${312 - wallH + 6} l-9 12 l7 12 l-8 14`} />
        </g>
      )}

      {/* gözcü feneri */}
      {doneByRole.SCOUT > 0 && (
        <g>
          <circle cx="560" cy="270" r="30" fill="none" stroke="#4fb3ff" strokeDasharray="2 5" opacity="0.7" />
          <line x1="560" y1="312" x2="560" y2="262" stroke={PAPER} strokeWidth="1.6" />
          <circle cx="560" cy="256" r="6" fill="#4fb3ff" />
        </g>
      )}

      {/* sis */}
      {foggy && (
        <g style={{ animation: "drift 9s ease-in-out infinite" }}>
          <g filter="url(#fogblur)" fill="#7f95a6">
            <ellipse cx="170" cy="292" rx="150" ry="24" opacity="0.38" />
            <ellipse cx="480" cy="276" rx="170" ry="28" opacity="0.34" />
            <ellipse cx="320" cy="316" rx="260" ry="20" opacity="0.4" />
            <ellipse cx="330" cy="236" rx="120" ry="18" opacity="0.2" />
          </g>
        </g>
      )}
    </svg>
  );
}

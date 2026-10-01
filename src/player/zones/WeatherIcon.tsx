/** Ícones de meteorologia animados (SVG + CSS, leves para um Raspberry Pi). */
const CSS = `
.mwx * { transform-box: fill-box; }
.mwx-spin { animation: mwx-spin 14s linear infinite; transform-origin: center; }
.mwx-drift { animation: mwx-drift 6s ease-in-out infinite alternate; }
.mwx-drift2 { animation: mwx-drift 8s ease-in-out infinite alternate-reverse; }
.mwx-drop { animation: mwx-drop 1.1s linear infinite; }
.mwx-flake { animation: mwx-flake 3s linear infinite; }
.mwx-bolt { animation: mwx-bolt 3.2s ease-in-out infinite; }
.mwx-glow { animation: mwx-glow 4s ease-in-out infinite; transform-origin: center; }
.mwx-fog { animation: mwx-fog 5s ease-in-out infinite alternate; }
@keyframes mwx-spin { to { transform: rotate(360deg) } }
@keyframes mwx-drift { from { transform: translateX(-4%) } to { transform: translateX(4%) } }
@keyframes mwx-drop { 0% { transform: translateY(-6px); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(14px); opacity: 0 } }
@keyframes mwx-flake { 0% { transform: translate(0,-6px); opacity: 0 } 20% { opacity: 1 } 50% { transform: translate(2px,4px) } 100% { transform: translate(-1px,14px); opacity: 0 } }
@keyframes mwx-bolt { 0%, 86%, 100% { opacity: 0 } 88%, 92% { opacity: 1 } 90% { opacity: .3 } }
@keyframes mwx-glow { 0%, 100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.06); opacity: 1 } }
@keyframes mwx-fog { from { transform: translateX(-6%) } to { transform: translateX(6%) } }
@media (prefers-reduced-motion: reduce) { .mwx * { animation: none !important } }
`;

const SUN = "#FDB813";
const CLOUD = "#E8EEF5";
const CLOUD_DARK = "#9AA8B8";
const RAIN = "#5AB4FF";

function Sun({
  cx = 32,
  cy = 32,
  r = 11,
  animated,
}: {
  cx?: number;
  cy?: number;
  r?: number;
  animated: boolean;
}) {
  return (
    <g>
      <g className={animated ? "mwx-spin" : ""} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy - r - 4}
            x2={cx}
            y2={cy - r - 9}
            stroke={SUN}
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${i * 45} ${cx} ${cy})`}
          />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
    </g>
  );
}

function Cloud({
  x = 0,
  y = 0,
  s = 1,
  fill = CLOUD,
  cls = "",
}: {
  x?: number;
  y?: number;
  s?: number;
  fill?: string;
  cls?: string;
}) {
  return (
    <g className={cls} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M18 44h30a10 10 0 0 0 0-20 14 14 0 0 0-27-3 9 9 0 0 0-3 23z" fill={fill} />
    </g>
  );
}

export function WeatherIcon({
  code,
  isDay = true,
  animated = true,
  style,
}: {
  code: number;
  isDay?: boolean;
  animated?: boolean;
  style?: React.CSSProperties;
}) {
  const a = animated;
  let body: React.ReactNode;
  if (code === 0 || code === 1) {
    body = isDay ? (
      <Sun animated={a} r={12} />
    ) : (
      <g className={a ? "mwx-glow" : ""}>
        <path d="M40 14a18 18 0 1 0 10 31A15 15 0 0 1 40 14z" fill="#F4E9B8" />
      </g>
    );
  } else if (code === 2) {
    body = (
      <>
        {isDay ? (
          <Sun cx={24} cy={24} r={9} animated={a} />
        ) : (
          <path d="M30 8a13 13 0 1 0 8 23 11 11 0 0 1-8-23z" fill="#F4E9B8" />
        )}
        <Cloud x={6} y={8} s={0.95} cls={a ? "mwx-drift" : ""} />
      </>
    );
  } else if (code === 3) {
    body = (
      <>
        <Cloud x={-4} y={-2} s={0.9} fill={CLOUD_DARK} cls={a ? "mwx-drift2" : ""} />
        <Cloud x={4} y={6} s={1} cls={a ? "mwx-drift" : ""} />
      </>
    );
  } else if (code <= 48) {
    body = (
      <>
        <Cloud x={2} y={-4} s={0.9} />
        {[44, 50, 56].map((y, i) => (
          <line
            key={y}
            className={a ? "mwx-fog" : ""}
            style={{ animationDelay: `${i * 0.6}s` }}
            x1={12 + i * 3}
            y1={y}
            x2={52 - i * 2}
            y2={y}
            stroke={CLOUD}
            strokeWidth="3"
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
      </>
    );
  } else if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    body = (
      <>
        <Cloud x={2} y={-6} />
        {[20, 30, 40, 25, 35].map((x, i) => (
          <circle
            key={i}
            className={a ? "mwx-flake" : ""}
            style={{ animationDelay: `${i * 0.55}s` }}
            cx={x}
            cy={48 + (i % 2) * 4}
            r="2.2"
            fill="#fff"
          />
        ))}
      </>
    );
  } else if (code >= 95) {
    body = (
      <>
        <Cloud x={2} y={-6} fill={CLOUD_DARK} />
        <polygon
          className={a ? "mwx-bolt" : ""}
          points="34,38 26,52 32,52 28,62 40,46 34,46 38,38"
          fill={SUN}
        />
        {[20, 44].map((x, i) => (
          <line
            key={x}
            className={a ? "mwx-drop" : ""}
            style={{ animationDelay: `${i * 0.4}s` }}
            x1={x}
            y1={44}
            x2={x - 2}
            y2={50}
            stroke={RAIN}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ))}
      </>
    );
  } else {
    // chuvisco e chuva
    const heavy = code >= 61;
    const xs = heavy ? [18, 26, 34, 42, 22, 38] : [22, 32, 42];
    body = (
      <>
        <Cloud x={2} y={-6} fill={heavy ? CLOUD_DARK : CLOUD} />
        {xs.map((x, i) => (
          <line
            key={i}
            className={a ? "mwx-drop" : ""}
            style={{ animationDelay: `${(i * 0.37) % 1.1}s` }}
            x1={x}
            y1={44 + (i % 2) * 3}
            x2={x - 2}
            y2={50 + (i % 2) * 3}
            stroke={RAIN}
            strokeWidth={heavy ? 2.6 : 2}
            strokeLinecap="round"
          />
        ))}
      </>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="mwx" style={{ overflow: "visible", ...style }}>
      <style>{CSS}</style>
      {body}
    </svg>
  );
}

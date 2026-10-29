import React from 'react';
import styles from './InstrumentCluster.module.css';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(Number(n)) ? Number(n) : 0));

function point(cx, cy, radius, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + Math.sin(a) * radius, y: cy - Math.cos(a) * radius };
}

function Dial({ cx, cy, radius, value, max, label, unit, redFrom = 1.1, formatter }) {
  const majorCount = label === 'RPM × 1000' ? Math.max(6, Math.round(max / 1000)) : label === 'VEHICLE SPEED' ? 13 : 8;
  const steps = majorCount * 5;
  const pct = clamp(value / max, 0, 1);
  const angle = -135 + pct * 270;
  const ticks = Array.from({ length: steps + 1 }, (_, i) => {
    const p = i / steps;
    const a = -135 + p * 270;
    const outer = point(cx, cy, radius - 4, a);
    const major = i % 5 === 0;
    const inner = point(cx, cy, radius - (major ? 17 : 10), a);
    return <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} className={p >= redFrom ? styles.redTick : major ? styles.majorTick : styles.tick} />;
  });
  const labels = Array.from({ length: majorCount + 1 }, (_, i) => {
    const p = i / majorCount;
    const pos = point(cx, cy, radius - 29, -135 + p * 270);
    const display = label === 'RPM × 1000' ? String(i) : String(Math.round((max * p) / 10) * 10);
    return <text key={i} x={pos.x} y={pos.y + 4} textAnchor="middle" className={styles.scale}>{display}</text>;
  });
  const needle = point(cx, cy, radius - 37, angle);
  return (
    <g>
      <circle cx={cx} cy={cy} r={radius + 5} className={styles.dialOuter} />
      <circle cx={cx} cy={cy} r={radius} className={styles.dialFace} />
      <circle cx={cx} cy={cy} r={radius - 22} className={styles.innerRing} />
      {ticks}
      {labels}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} className={styles.needle} />
      <circle cx={cx} cy={cy} r="6" className={styles.hub} />
      <text x={cx} y={cy + 22} textAnchor="middle" className={styles.readout}>{formatter(value)}</text>
      <text x={cx} y={cy + 41} textAnchor="middle" className={styles.unit}>{unit}</text>
      <text x={cx} y={cy + radius + 23} textAnchor="middle" className={styles.dialLabel}>{label}</text>
    </g>
  );
}

/** OEM-inspired twin-dial digital cockpit shared by Live Engine and Drag. */
export function InstrumentCluster({
  rpm = 0,
  speedKph = 0,
  gear = 'P',
  gearCount = 6,
  maxRpm = 8000,
  coolantC = 20,
  status = 'SIMULATION',
  tripKm = 0,
  variant = 'oem',
  mode = 'cockpit',
  telemetry = null,
}) {
  const numericGear = typeof gear === 'number' ? gear : 0;
  const rpmMax = Math.max(6000, maxRpm);
  const gearText = numericGear > 0 ? String(numericGear) : String(gear ?? 'P');
  const cleanStatus = String(status).replaceAll('•', '·');
  return (
    <div className={styles.cluster} data-variant={variant} data-mode={mode}>
      <svg className={styles.dials} viewBox="0 0 1000 340" role="img" aria-label={`Digital instrument cluster: ${Math.round(rpm)} RPM, ${Math.round(speedKph)} kilometres per hour, gear ${gear}`}>
        <defs>
          <linearGradient id="oemClusterFrame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ink2)" />
            <stop offset="35%" stopColor="var(--panel2)" />
            <stop offset="70%" stopColor="var(--bg)" />
            <stop offset="100%" stopColor="var(--line-hi)" />
          </linearGradient>
          <radialGradient id="oemClusterBlack" cx="50%" cy="38%" r="75%">
            <stop offset="0%" stopColor="var(--bg)" />
            <stop offset="100%" stopColor="var(--bg)" />
          </radialGradient>
        </defs>
        <path d="M20 78 Q20 24 78 18 H922 Q980 24 980 78 V267 Q980 310 930 316 H70 Q20 310 20 267 Z" className={styles.clusterBezel} />
        <path d="M34 80 Q34 36 82 31 H918 Q966 36 966 80 V264 Q966 297 925 302 H75 Q34 297 34 264 Z" fill="url(#oemClusterBlack)" stroke="url(#oemClusterFrame)" strokeWidth="3" />
        <path d="M58 72 Q62 46 92 44 H908 Q938 46 942 72" className={styles.topHighlight} />

        <text x="500" y="64" textAnchor="middle" className={styles.topline}>KM AUTOS DIAGNOSTICS</text>
        <text x="500" y="88" textAnchor="middle" className={styles.topMeta}>{mode === 'dyno' ? '26°C · DYNO CELL' : mode === 'drag' ? '25°C · DRAG STRIP' : '25°C · DIGITAL COCKPIT'}</text>

        <Dial cx={275} cy={173} radius={105} value={rpm} max={rpmMax} label="RPM × 1000" unit={mode === 'dyno' ? 'RPM' : 'r/min'} redFrom={0.78} formatter={(v) => mode === 'dyno' ? String(Math.round(v)) : (v / 1000).toFixed(1)} />
        <Dial cx={725} cy={173} radius={105} value={speedKph} max={260} label="VEHICLE SPEED" unit="km/h" redFrom={1.1} formatter={(v) => String(Math.round(v))} />

        <g className={styles.centerPanel}>
          <text x="500" y="133" textAnchor="middle" className={styles.centerCaption}>{mode === 'dyno' ? 'DYNO RUN' : mode === 'drag' ? 'DRAG RUN' : 'GEAR'}</text>
          <text x="500" y="194" textAnchor="middle" className={styles.gear}>{gearText}</text>
          <text x="500" y="216" textAnchor="middle" className={styles.centerCaption}>{mode === 'dyno' ? 'GEAR' : numericGear > 0 ? `OF ${Math.max(1, Math.min(6, gearCount))}` : 'SELECTOR'}</text>
          <line x1="443" y1="232" x2="557" y2="232" className={styles.centerDivider} />
          <text x="500" y="251" textAnchor="middle" className={styles.small}>COOLANT {Math.round(coolantC)}°C</text>
          <text x="500" y="270" textAnchor="middle" className={styles.status}>{mode === 'dyno' ? `DYNO STATUS · ${cleanStatus}` : mode === 'drag' ? `DRAG STATUS · ${cleanStatus}` : cleanStatus}</text>
        </g>

        <g className={styles.sideReadouts}>
          <text x="102" y="123" textAnchor="middle" className={styles.sideLabel}>TEMP</text>
          <text x="102" y="145" textAnchor="middle" className={styles.sideValue}>{Math.round(coolantC)}°</text>
          <text x="898" y="123" textAnchor="middle" className={styles.sideLabel}>TRIP</text>
          <text x="898" y="145" textAnchor="middle" className={styles.sideValue}>{Number(tripKm).toFixed(1)}</text>
          <text x="898" y="161" textAnchor="middle" className={styles.sideUnit}>km</text>
        </g>

        <line x1="112" y1="286" x2="888" y2="286" className={styles.footerLine} />
        <text x="135" y="303" className={styles.footer}>ENGINE</text>
        <text x="865" y="303" textAnchor="end" className={styles.footer}>{numericGear > 0 ? `GEAR ${numericGear} / ${Math.max(1, Math.min(6, gearCount))}` : 'PARK / NEUTRAL'}</text>
        <circle cx="500" cy="286" r="3" className={styles.statusDot} />
      </svg>
      {Array.isArray(telemetry) && telemetry.length > 0 && (
        <div className={styles.telemetry} role="group" aria-label="Additional engine telemetry">
          {telemetry.map((item) => (
            <div className={styles.telemetryItem} key={item.label}>
              <span className={styles.telemetryLabel}>{item.label}</span>
              <span className={styles.telemetryValue}>{item.value}<small>{item.unit ?? ''}</small></span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.gearStrip} aria-label="Gear position">
        {Array.from({ length: Math.max(1, Math.min(6, gearCount)) }, (_, i) => {
          const n = i + 1;
          return <span key={n} className={numericGear === n ? styles.gearActive : styles.gearSlot} data-active={numericGear === n ? 'true' : 'false'}>{n}</span>;
        })}
      </div>
    </div>
  );
}

"use client"

// A dependency-free stand-in for the mobile app's react-native-chart-kit
// LineChart on the Analytics screen: same idea (labels along the bottom,
// values plotted as a smooth-ish line with dots), just drawn as plain SVG
// since there is no chart library in this project.

type Props = {
  labels: string[]
  data: number[]
  formatValue?: (value: number) => string
}

// Revenue/orders data has one point per day, so "Month" already has ~30
// labels and "Quarter"/"Year" have far more — all squeezed under one chart
// width makes them overlap and become unreadable. This keeps every point on
// the line but only labels a handful of them (evenly spaced, always
// including the last one), same trick the native screen uses.
const MAX_VISIBLE_LABELS = 6
function thinLabels(labels: string[]): string[] {
  if (labels.length <= MAX_VISIBLE_LABELS) return labels
  const step = Math.ceil(labels.length / MAX_VISIBLE_LABELS)
  return labels.map((label, i) => (i % step === 0 || i === labels.length - 1 ? label : ""))
}

const WIDTH = 640
const HEIGHT = 220
const PAD_LEFT = 40
const PAD_RIGHT = 12
const PAD_TOP = 16
const PAD_BOTTOM = 28

export function RevenueLineChart({ labels, data, formatValue }: Props) {
  const max = Math.max(...data, 1)
  const min = 0
  const chartWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  const points = data.map((value, i) => {
    const x = PAD_LEFT + (data.length === 1 ? chartWidth / 2 : (i / (data.length - 1)) * chartWidth)
    const y = PAD_TOP + chartHeight - ((value - min) / (max - min || 1)) * chartHeight
    return { x, y, value }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1]?.x.toFixed(1) ?? PAD_LEFT} ${PAD_TOP + chartHeight} L ${PAD_LEFT} ${PAD_TOP + chartHeight} Z`
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
  const shownLabels = thinLabels(labels)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Revenue trend chart">
      {gridLines.map((fraction) => {
        const y = PAD_TOP + chartHeight * fraction
        return <line key={fraction} x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} stroke="#F0F0F0" strokeWidth={1} />
      })}
      <text x={4} y={PAD_TOP + 4} className="fill-[var(--muted)]" fontSize={10}>
        {formatValue ? formatValue(max) : max.toLocaleString()}
      </text>
      <text x={4} y={PAD_TOP + chartHeight + 4} className="fill-[var(--muted)]" fontSize={10}>
        0
      </text>

      <path d={areaPath} fill="var(--orange)" opacity={0.08} />
      <path d={linePath} fill="none" stroke="var(--orange)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="white" stroke="var(--orange)" strokeWidth={2} />
      ))}

      {shownLabels.map((label, i) =>
        label ? (
          <text
            key={i}
            x={points[i].x}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            className="fill-[var(--muted)]"
          >
            {label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

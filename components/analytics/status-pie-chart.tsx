"use client"

// Dependency-free stand-in for the mobile app's react-native-chart-kit
// PieChart on the Analytics screen. Drawn as an SVG donut plus a legend
// listing each status with its raw count and percentage, same as the app.

type Slice = { name: string; color: string; count: number; population: number }

const SIZE = 140
const STROKE = 26
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function StatusPieChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0) || 1
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" role="img" aria-label="Order status distribution">
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#F0F0F0" strokeWidth={STROKE} />
        {slices.map((slice, i) => {
          const fraction = slice.count / total
          const dash = fraction * CIRCUMFERENCE
          const circle = (
            <circle
              key={i}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          )
          offset += dash
          return circle
        })}
      </svg>

      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Status</p>
        <div className="divide-y divide-[#F0F0F0]">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2.5">
              <span className="mt-0.5 size-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{slice.name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {slice.count} order{slice.count === 1 ? "" : "s"} · {slice.population}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

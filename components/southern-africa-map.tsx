import mapData from '@/lib/southern-africa-map-data.json'

type CountryShape = {
  id: string
  name: string
  covered: boolean
  d: string
  cx: number
  cy: number
  labelX: number
  labelY: number
  leader: boolean
}

const { viewBox, countries } = mapData as {
  viewBox: { x: number; y: number; w: number; h: number }
  countries: CountryShape[]
}

export function SouthernAfricaMap() {
  return (
    <svg
      className="sa-map"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      role="img"
      aria-label="Map of Southern Africa with 1st Energy's seven covered countries highlighted in orange: South Africa, Namibia, Botswana, Zimbabwe, Zambia, Mozambique and Eswatini."
    >
      {countries.map((c) => (
        <path key={c.id} d={c.d} className={c.covered ? 'sa-country sa-country-covered' : 'sa-country sa-country-muted'} />
      ))}
      {countries.map((c) => (
        c.leader ? (
          <g key={`leader-${c.id}`} className="sa-leader">
            <line x1={c.cx} y1={c.cy} x2={c.labelX - 3} y2={c.labelY - 3} />
            <circle cx={c.cx} cy={c.cy} r="2.2" />
          </g>
        ) : null
      ))}
      {countries.map((c) => (
        <text
          key={`label-${c.id}`}
          x={c.labelX}
          y={c.labelY}
          textAnchor={c.leader ? 'start' : 'middle'}
          className={c.covered ? 'sa-label sa-label-covered' : 'sa-label sa-label-muted'}
        >
          {c.name}
        </text>
      ))}
    </svg>
  )
}

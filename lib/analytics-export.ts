// Web equivalent of the mobile app's src/services/analyticsExportService.js.
// Same three exports (PDF report, spreadsheet data, quick share), adapted to
// what a browser can do without adding new dependencies:
//   - PDF   -> opens the same report layout in a new tab and calls
//              window.print(), so the admin picks "Save as PDF" from the
//              browser's print dialog (no server-side PDF generation needed).
//   - Excel -> downloads a CSV (opens fine in Excel/Sheets) instead of a
//              .xlsx workbook, since there's no xlsx library in this project.
//   - Share -> uses the Web Share API when the browser supports it, and
//              falls back to copying the same summary text to the clipboard.

import type { AnalyticsData, AnalyticsPeriod } from "./analytics-service"

const periodLabel = (period: AnalyticsPeriod) =>
  ({ week: "Last 7 Days", month: "Last Month", quarter: "Last Quarter", year: "Last Year" })[period] || period

const totalRevenueOf = (data: AnalyticsData) => (data.revenue.data || []).reduce((a, b) => a + b, 0)

function buildReportHtml(data: AnalyticsData, period: AnalyticsPeriod, currencySymbol: string): string {
  const totalRevenue = totalRevenueOf(data)
  const statusRows = data.statusDistribution
    .map((s) => `<tr><td>${s.name}</td><td>${s.count}</td><td>${s.population}%</td></tr>`)
    .join("")
  const productRows = data.topProducts
    .map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.sales}</td></tr>`)
    .join("")

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Analytics Report</title>
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #222; }
      h1 { color: #FF4F00; margin-bottom: 0; }
      .subtitle { color: #777; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th, td { padding: 8px; text-align: left; }
      table.bordered, table.bordered th, table.bordered td { border: 1px solid #eee; }
      thead tr { background: #f5f5f5; }
    </style>
  </head>
  <body>
    <h1>Analytics Report</h1>
    <p class="subtitle">${periodLabel(period)} &middot; Generated ${new Date().toLocaleString()}</p>

    <h2>Overview</h2>
    <table>
      <tr><td>Total Revenue</td><td><b>${currencySymbol}${totalRevenue.toLocaleString()}</b></td></tr>
      <tr><td>Total Orders</td><td><b>${data.totalOrdersCount || 0}</b></td></tr>
      <tr><td>Completion Rate</td><td><b>${data.completionRate || 0}%</b></td></tr>
    </table>

    <h2>Order Status Distribution</h2>
    <table class="bordered">
      <thead><tr><th>Status</th><th>Orders</th><th>Share</th></tr></thead>
      <tbody>${statusRows || '<tr><td colspan="3">No orders in this period</td></tr>'}</tbody>
    </table>

    <h2>Top Products</h2>
    <table class="bordered">
      <thead><tr><th>#</th><th>Product</th><th>Orders</th></tr></thead>
      <tbody>${productRows || '<tr><td colspan="3">No product sales in this period</td></tr>'}</tbody>
    </table>
  </body>
</html>`
}

function csvCell(value: string | number): string {
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportPDF(data: AnalyticsData, period: AnalyticsPeriod, currencySymbol: string) {
  const html = buildReportHtml(data, period, currencySymbol)
  const printWindow = window.open("", "_blank")
  if (!printWindow) throw new Error("Pop-up blocked. Allow pop-ups to export the PDF report.")
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

function exportExcel(data: AnalyticsData, period: AnalyticsPeriod) {
  const lines: string[] = []
  lines.push("Overview")
  lines.push(["Metric", "Value"].map(csvCell).join(","))
  lines.push(["Period", periodLabel(period)].map(csvCell).join(","))
  lines.push(["Total Revenue", totalRevenueOf(data)].map(csvCell).join(","))
  lines.push(["Total Orders", data.totalOrdersCount || 0].map(csvCell).join(","))
  lines.push(["Completion Rate (%)", data.completionRate || 0].map(csvCell).join(","))
  lines.push("")
  lines.push("Status Distribution")
  lines.push(["Status", "Orders", "Share (%)"].map(csvCell).join(","))
  for (const s of data.statusDistribution) lines.push([s.name, s.count, s.population].map(csvCell).join(","))
  lines.push("")
  lines.push("Top Products")
  lines.push(["Rank", "Product", "Orders"].map(csvCell).join(","))
  data.topProducts.forEach((p, i) => lines.push([i + 1, p.name, p.sales].map(csvCell).join(",")))

  downloadFile(`analytics-${period}-${Date.now()}.csv`, lines.join("\n"), "text/csv;charset=utf-8;")
}

async function shareSummary(data: AnalyticsData, period: AnalyticsPeriod, currencySymbol: string) {
  const totalRevenue = totalRevenueOf(data)
  const message =
    `Analytics — ${periodLabel(period)}\n\n` +
    `Revenue: ${currencySymbol}${totalRevenue.toLocaleString()}\n` +
    `Orders: ${data.totalOrdersCount || 0}\n` +
    `Completion Rate: ${data.completionRate || 0}%\n\n` +
    `Top Product: ${data.topProducts[0]?.name || "N/A"}`

  if (navigator.share) {
    await navigator.share({ title: "Analytics Summary", text: message })
    return "shared"
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(message)
    return "copied"
  }
  throw new Error("Sharing is not supported in this browser.")
}

export const analyticsExportService = {
  exportPDF,
  exportExcel,
  shareSummary,
}

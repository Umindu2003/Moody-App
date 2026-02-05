import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

interface ExportData {
  period: string;
  insights: any;
  moodData: any[];
  comparison: any;
  distribution: any[];
}

export async function generateAndSharePDF(data: ExportData): Promise<void> {
  try {
    let logoSrc = "";

    const loadPngDataUri = async (moduleRef: number): Promise<string> => {
      try {
        const asset = Asset.fromModule(moduleRef);
        await asset.downloadAsync();
        const uri = asset.localUri || asset.uri;

        if (uri && FileSystem?.readAsStringAsync) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64",
          });
          return `data:image/png;base64,${base64}`;
        }

        return uri || "";
      } catch (error) {
        console.warn("Unable to load image for PDF:", error);
        return "";
      }
    };

    try {
      logoSrc = await loadPngDataUri(require("../assets/images/Moody.png"));
    } catch (logoError) {
      console.warn("Unable to load logo for PDF:", logoError);
    }

    const htmlContent = generateHTMLContent(data, logoSrc);
    const fileName = `Moody_Report_${data.period}_${new Date().toISOString().split("T")[0]}.pdf`;

    // Generate PDF from HTML
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Share the PDF file - user can choose to save it manually
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Save or Share Mood Report",
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

function generateHTMLContent(
  data: ExportData,
  logoSrc: string,
): string {
  const { period, moodData, distribution } = data;
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const moodLabels = ["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"];
  const today = new Date();

  const buildTrendData = () => {
    let periods: Date[] = [];
    let labels: string[] = [];

    if (period === "week") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        periods.push(date);
      }
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      labels = periods.map((date) => dayLabels[date.getDay()]);
    } else if (period === "month") {
      // Last 30 days grouped by weeks
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i * 7);
        date.setHours(0, 0, 0, 0);
        periods.push(date);
        labels.push(`Week ${5 - i}`);
      }
    } else if (period === "year") {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        periods.push(date);
      }
      const monthLabels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      labels = periods.map((date) => monthLabels[date.getMonth()]);
    }

    const dataPoints = periods.map((periodStart, index) => {
      let periodEntries: any[] = [];

      if (period === "week") {
        periodEntries = moodData.filter((entry) => {
          const entryDate = entry.timestamp.toDate();
          return (
            entryDate.getDate() === periodStart.getDate() &&
            entryDate.getMonth() === periodStart.getMonth() &&
            entryDate.getFullYear() === periodStart.getFullYear()
          );
        });
      } else if (period === "month") {
        const weekEnd = new Date(periodStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        periodEntries = moodData.filter((entry) => {
          const entryDate = entry.timestamp.toDate();
          return entryDate >= periodStart && entryDate < weekEnd;
        });
      } else if (period === "year") {
        periodEntries = moodData.filter((entry) => {
          const entryDate = entry.timestamp.toDate();
          return (
            entryDate.getMonth() === periodStart.getMonth() &&
            entryDate.getFullYear() === periodStart.getFullYear()
          );
        });
      }

      const avgMood =
        periodEntries.length > 0
          ? periodEntries.reduce((sum, entry) => sum + entry.value, 0) /
            periodEntries.length
          : 0;

      return {
        label: labels[index],
        mood: avgMood,
        entries: periodEntries.length,
      };
    });

    return { labels, dataPoints };
  };

  const { labels, dataPoints } = buildTrendData();

  const chartHeight = 240;
  const chartWidth = 520;
  const padding = 70;
  const xDivisions = Math.max(1, labels.length);

  const reportTitle =
    period === "week" ? "Weekly" : period === "month" ? "Monthly" : "Yearly";
  const chartTitle =
    period === "week"
      ? "Your Mood This Week"
      : period === "month"
        ? "Your Mood This Month"
        : "Your Mood This Year";

  const pieData =
    Array.isArray(distribution) && distribution.length > 0
      ? distribution
      : [
          {
            label: "No Data",
            population: 1,
            percentage: 100,
            color: "#e0e0e0",
          },
        ];

  const pieTotal = pieData.reduce(
    (sum, item) => sum + (Number(item.population) || 0),
    0,
  );

  const pieRadius = 70;
  const pieCx = 90;
  const pieCy = 90;
  let cumulativeAngle = -90;

  const pieSlices = pieData
    .map((item) => {
      const value = Number(item.population) || 0;
      const sliceAngle =
        pieTotal > 0 ? (value / pieTotal) * 360 : 0;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + sliceAngle;
      cumulativeAngle = endAngle;

      const startRadians = (Math.PI / 180) * startAngle;
      const endRadians = (Math.PI / 180) * endAngle;

      const x1 = pieCx + pieRadius * Math.cos(startRadians);
      const y1 = pieCy + pieRadius * Math.sin(startRadians);
      const x2 = pieCx + pieRadius * Math.cos(endRadians);
      const y2 = pieCy + pieRadius * Math.sin(endRadians);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      const d = `
        M ${pieCx} ${pieCy}
        L ${x1} ${y1}
        A ${pieRadius} ${pieRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

      return `<path d="${d}" fill="${item.color || "#4caf50"}" />`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moody - ${reportTitle} Mood Chart</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 12mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 16px;
      background: #f8f9fa;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 24px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      page-break-inside: avoid;
    }
    
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4caf50;
    }
    
    .logo-image {
      width: 220px;
      height: auto;
      margin: 0 auto 10px;
      display: block;
    }
    
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .date {
      font-size: 14px;
      color: #999;
    }
    
    .chart-container {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      margin: 24px 0;
      gap: 18px;
    }

    .chart-card {
      border: 1px solid #e6e6e6;
      border-radius: 14px;
      background: #fcfcfc;
      padding: 18px;
    }
    
    .chart-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
    }

    .chart-title-sm {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }
    
    .chart {
      position: relative;
      width: ${chartWidth + padding * 2}px;
      height: ${chartHeight + padding * 2}px;
      margin-bottom: 8px;
    }
    
    .chart-svg {
      width: 100%;
      height: 100%;
    }
    
    .axis-label-y {
      font-size: 12px;
      fill: #666;
      text-anchor: end;
    }
    
    .axis-label-x {
      font-size: 12px;
      fill: #666;
      text-anchor: middle;
    }
    
    .grid-line {
      stroke: #eceff1;
      stroke-width: 1;
      stroke-dasharray: 4 4;
    }

    .axis-line {
      stroke: #cfd8dc;
      stroke-width: 1.5;
    }
    
    .bar {
      fill: #4caf50;
    }

    .bar-shadow {
      fill: rgba(76, 175, 80, 0.15);
    }

    .bar-value {
      font-size: 12px;
      fill: #2e7d32;
      font-weight: 600;
      text-anchor: middle;
    }
    
    .legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-text {
      font-size: 11px;
      color: #666;
    }

    .legend-color {
      width: 10px;
      height: 10px;
      border-radius: 5px;
    }

    .legend-value {
      font-size: 11px;
      color: #999;
      margin-left: auto;
    }

    .pie-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 8px;
    }
    
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      color: #999;
      font-size: 12px;
    }
    
    @media print {
      body {
        background: white;
        padding: 20px;
      }
      
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoSrc ? `<img class="logo-image" src="${logoSrc}" alt="Moody Logo" />` : ""}
      <div class="subtitle">${reportTitle} Mood Trend</div>
      <div class="date">Generated on ${currentDate}</div>
    </div>
    
    <div class="chart-container">
      <h2 class="chart-title">${reportTitle} Mood Report</h2>

      <div class="chart-card">
        <div class="chart-title-sm">${chartTitle}</div>
        <div class="chart">
          <svg class="chart-svg" viewBox="0 0 ${chartWidth + padding * 2} ${chartHeight + padding * 2}">
            <!-- Grid lines -->
            ${Array.from({ length: 6 }, (_, i) => {
              const y = padding + (chartHeight / 5) * i;
              return `<line x1="${padding}" y1="${y}" x2="${chartWidth + padding}" y2="${y}" class="grid-line" />`;
            }).join("")}

            <!-- Axis lines -->
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${chartHeight + padding}" class="axis-line" />
            <line x1="${padding}" y1="${chartHeight + padding}" x2="${chartWidth + padding}" y2="${chartHeight + padding}" class="axis-line" />
            
            <!-- Y-axis labels (moods) -->
            ${moodLabels
              .map((label, i) => {
                const y = padding + chartHeight - (chartHeight / 5) * i;
                return `<text x="${padding - 12}" y="${y + 4}" class="axis-label-y">${label}</text>`;
              })
              .join("")}
            
            <!-- X-axis labels (days) -->
            ${labels
              .map((label, i) => {
                const x =
                  padding +
                  (chartWidth / xDivisions) * i +
                  chartWidth / (xDivisions * 2);
                return `<text x="${x}" y="${chartHeight + padding + 26}" class="axis-label-x">${label}</text>`;
              })
              .join("")}

            <!-- Bars -->
            ${dataPoints
              .map((data, i) => {
                const slotWidth = chartWidth / xDivisions;
                const barWidth = Math.max(22, slotWidth * 0.65);
                const x = padding + slotWidth * i + (slotWidth - barWidth) / 2;
                const moodValue = Math.max(0, Math.min(5, data.mood || 0));
                const barHeight = (chartHeight / 5) * moodValue;
                const y = padding + chartHeight - barHeight;
                const shadowHeight = chartHeight / 5;
                const shadowY = padding + chartHeight - shadowHeight;
                const labelY = y - 10;
                return `
                  <rect x="${x}" y="${shadowY}" width="${barWidth}" height="${shadowHeight}" rx="7" class="bar-shadow" />
                  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="7" class="bar" />
                  <text x="${x + barWidth / 2}" y="${labelY}" class="bar-value">${moodValue > 0 ? moodValue.toFixed(1) : "0"}</text>
                `;
              })
              .join("")}
          </svg>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-title-sm">Mood Distribution</div>
        <div class="pie-wrapper">
          <svg width="220" height="220" viewBox="0 0 180 180">
            ${pieSlices}
          </svg>
        </div>
        <div class="legend">
          ${pieData
            .map(
              (item) => `
            <div class="legend-item">
              <span class="legend-color" style="background:${item.color || "#4caf50"}"></span>
              <span class="legend-text">${item.label}</span>
              <span class="legend-value">${item.population ?? 0} (${item.percentage ?? 0}%)</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div style="font-size: 18px; font-weight: 600; color: #4caf50; margin-bottom: 8px;">Moody</div>
      <div>Track your emotions, understand yourself better</div>
      <div style="margin-top: 8px; font-size: 10px;">© ${new Date().getFullYear()} Moody. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
  `;
}

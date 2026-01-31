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

    try {
      const logoAsset = Asset.fromModule(require("../assets/images/Moody.png"));
      await logoAsset.downloadAsync();
      const logoUri = logoAsset.localUri || logoAsset.uri;

      if (logoUri && FileSystem?.readAsStringAsync) {
        const base64 = await FileSystem.readAsStringAsync(logoUri, {
          encoding: "base64",
        });
        logoSrc = `data:image/png;base64,${base64}`;
      } else if (logoUri) {
        logoSrc = logoUri;
      }
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

function generateHTMLContent(data: ExportData, logoSrc: string): string {
  const { period, moodData } = data;
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const moodEmojis = ["😢", "🥺", "😌", "🥰", "🤩"]; // 1-5 mood scale
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

      const emoji =
        avgMood > 0
          ? moodEmojis[Math.min(4, Math.max(0, Math.round(avgMood) - 1))]
          : "😌";

      return {
        label: labels[index],
        mood: avgMood,
        emoji,
        entries: periodEntries.length,
      };
    });

    return { labels, dataPoints };
  };

  const { labels, dataPoints } = buildTrendData();

  const chartHeight = 240;
  const chartWidth = 520;
  const padding = 60;
  const xDivisions = Math.max(1, labels.length);

  const reportTitle =
    period === "week" ? "Weekly" : period === "month" ? "Monthly" : "Yearly";
  const chartTitle =
    period === "week"
      ? "Your Mood This Week"
      : period === "month"
        ? "Your Mood This Month"
        : "Your Mood This Year";

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
      align-items: center;
      margin: 24px 0;
    }
    
    .chart-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
    }
    
    .chart {
      position: relative;
      width: ${chartWidth + padding * 2}px;
      height: ${chartHeight + padding * 2}px;
      border: 1px solid #e6e6e6;
      border-radius: 12px;
      background: #fcfcfc;
      margin-bottom: 12px;
    }
    
    .chart-svg {
      width: 100%;
      height: 100%;
    }
    
    .axis-label-y {
      font-size: 12px;
      fill: #666;
      text-anchor: middle;
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
    
    .data-line {
      fill: none;
      stroke: #4caf50;
      stroke-width: 3.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .data-area {
      fill: url(#areaGradient);
      stroke: none;
    }
    
    .data-point {
      fill: #4caf50;
      stroke: white;
      stroke-width: 2.5;
      r: 5;
    }
    
    .mood-emoji {
      font-size: 18px;
      text-anchor: middle;
      dominant-baseline: middle;
    }
    
    .legend {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 12px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 10px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .legend-emoji {
      font-size: 20px;
    }
    
    .legend-text {
      font-size: 11px;
      color: #666;
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
      <h2 class="chart-title">${chartTitle}</h2>
      
      <div class="chart">
        <svg class="chart-svg" viewBox="0 0 ${chartWidth + padding * 2} ${chartHeight + padding * 2}">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#4caf50" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#4caf50" stop-opacity="0" />
            </linearGradient>
          </defs>
          <!-- Grid lines -->
          ${Array.from({ length: 6 }, (_, i) => {
            const y = padding + (chartHeight / 5) * i;
            return `<line x1="${padding}" y1="${y}" x2="${chartWidth + padding}" y2="${y}" class="grid-line" />`;
          }).join("")}
          
          ${Array.from({ length: labels.length + 1 }, (_, i) => {
            const x = padding + (chartWidth / xDivisions) * i;
            return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${chartHeight + padding}" class="grid-line" />`;
          }).join("")}

          <!-- Axis lines -->
          <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${chartHeight + padding}" class="axis-line" />
          <line x1="${padding}" y1="${chartHeight + padding}" x2="${chartWidth + padding}" y2="${chartHeight + padding}" class="axis-line" />
          
          <!-- Y-axis labels (moods) -->
          ${moodLabels
            .map((label, i) => {
              const y = padding + chartHeight - (chartHeight / 5) * i;
              return `<text x="${padding - 30}" y="${y}" class="axis-label-y">${label}</text>`;
            })
            .join("")}
          
          <!-- X-axis labels (days) -->
          ${labels
            .map((label, i) => {
              const x =
                padding +
                (chartWidth / xDivisions) * i +
                chartWidth / (xDivisions * 2);
              return `<text x="${x}" y="${chartHeight + padding + 25}" class="axis-label-x">${label}</text>`;
            })
            .join("")}
          
          <!-- Data area -->
          <polygon
            points="${dataPoints
              .map((data, i) => {
                const x =
                  padding +
                  (chartWidth / xDivisions) * i +
                  chartWidth / (xDivisions * 2);
                const y =
                  data.mood > 0
                    ? padding +
                      chartHeight -
                      (chartHeight / 5) * (data.mood - 1)
                    : padding + chartHeight / 2;
                return `${x},${y}`;
              })
              .join(" ")} ${
              padding + chartWidth / (xDivisions * 2)
            },${chartHeight + padding} ${
              padding +
              (chartWidth / xDivisions) * (dataPoints.length - 1) +
              chartWidth / (xDivisions * 2)
            },${chartHeight + padding}"
            class="data-area"
          />

          <!-- Data line -->
          <polyline 
            points="${dataPoints
              .map((data, i) => {
                const x =
                  padding +
                  (chartWidth / xDivisions) * i +
                  chartWidth / (xDivisions * 2);
                const y =
                  data.mood > 0
                    ? padding +
                      chartHeight -
                      (chartHeight / 5) * (data.mood - 1)
                    : padding + chartHeight / 2;
                return `${x},${y}`;
              })
              .join(" ")}"
            class="data-line"
          />
          
          <!-- Data points -->
          ${dataPoints
            .map((data, i) => {
              const x =
                padding +
                (chartWidth / xDivisions) * i +
                chartWidth / (xDivisions * 2);
              const y =
                data.mood > 0
                  ? padding + chartHeight - (chartHeight / 5) * (data.mood - 1)
                  : padding + chartHeight / 2;
              return `<circle cx="${x}" cy="${y}" class="data-point" />`;
            })
            .join("")}
          
          <!-- Mood emojis at data points -->
          ${dataPoints
            .map((data, i) => {
              const x =
                padding +
                (chartWidth / xDivisions) * i +
                chartWidth / (xDivisions * 2);
              const y =
                data.mood > 0
                  ? padding +
                    chartHeight -
                    (chartHeight / 5) * (data.mood - 1) -
                    25
                  : padding + chartHeight / 2 - 25;
              return `<text x="${x}" y="${y}" class="mood-emoji">${data.emoji}</text>`;
            })
            .join("")}
        </svg>
      </div>
      
      <!-- Legend -->
      <div class="legend">
        ${moodEmojis
          .map(
            (emoji, i) => `
          <div class="legend-item">
            <span class="legend-emoji">${emoji}</span>
            <span class="legend-text">${i === 0 ? "Very Sad" : i === 1 ? "Sad" : i === 2 ? "Neutral" : i === 3 ? "Happy" : "Very Happy"}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
    
    <div class="footer">
      <div style="font-size: 18px; font-weight: 600; color: #4caf50; margin-bottom: 8px;">Moody</div>
      <div>Track your emotions, understand yourself better</div>
      <div style="margin-top: 8px;">© ${new Date().getFullYear()} Moody. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
  `;
}

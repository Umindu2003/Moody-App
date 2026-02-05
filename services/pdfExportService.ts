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
    const fileName = `Moody_Report_${data.period}.pdf`;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

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
  const { period, moodData, distribution } = data;
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const moodLabels = ["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"];
  const today = new Date();

  // --- LOGIC: PROCESS TREND DATA ---
  const buildTrendData = () => {
    let periods: Date[] = [];
    let labels: string[] = [];

    if (period === "week") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        periods.push(date);
      }
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      labels = periods.map((date) => dayLabels[date.getDay()]);
    } else if (period === "month") {
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i * 7);
        date.setHours(0, 0, 0, 0);
        periods.push(date);
        labels.push(`Week ${5 - i}`);
      }
    } else if (period === "year") {
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
      // (Filtering logic same as before...)
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

  // --- CALCULATE ADVANCED INSIGHTS ---
  const totalEntries = moodData.length;

  const overallSum = moodData.reduce(
    (sum, entry) => sum + (entry.value || 0),
    0,
  );
  const averageScore =
    totalEntries > 0 ? (overallSum / totalEntries).toFixed(1) : "0.0";

  // Find dominant mood from distribution
  let dominantMoodLabel = "N/A";
  let maxCount = 0;
  if (Array.isArray(distribution)) {
    distribution.forEach((item) => {
      const count = Number(item.population) || 0;
      if (count > maxCount) {
        maxCount = count;
        dominantMoodLabel = item.label;
      }
    });
  }

  // Generate a dynamic summary sentence
  const avgNum = parseFloat(averageScore);
  let summaryText = "Keep tracking to see more insights!";
  if (totalEntries > 0) {
    if (avgNum >= 4)
      summaryText =
        "You've had a fantastic period! Positive vibes are dominant.";
    else if (avgNum >= 3)
      summaryText = "Your mood has been balanced and stable recently.";
    else if (avgNum >= 2)
      summaryText = "You've had some ups and downs. Be kind to yourself.";
    else
      summaryText =
        "It's been a tough period. Remember to take time for self-care.";
  }

  // --- CHART DIMENSIONS ---
  const chartHeight = 280;
  const chartWidth = 600;
  const padding = 40;
  const xDivisions = Math.max(1, labels.length);

  const reportTitle =
    period === "week" ? "Weekly" : period === "month" ? "Monthly" : "Yearly";
  const chartTitle =
    period === "week"
      ? "Your Mood This Week"
      : period === "month"
        ? "Your Mood This Month"
        : "Your Mood This Year";

  // --- PIE DATA LOGIC ---
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

  // MAXIMIZED PIE SIZE
  const pieRadius = 110; // Huge radius
  const pieCx = 125;
  const pieCy = 125;
  const pieViewBoxSize = 250;
  let cumulativeAngle = -90;

  const pieSlices = pieData
    .map((item) => {
      const value = Number(item.population) || 0;
      const sliceAngle = pieTotal > 0 ? (value / pieTotal) * 360 : 0;
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page {
      size: A4;
      margin: 10mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333;
      background: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    /* HEADER */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #4caf50;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .header-info {
        text-align: left;
    }

    .logo-image {
      width: 140px;
      height: auto;
      display: block;
    }
    
    .subtitle { font-size: 24px; color: #333; font-weight: 800; letter-spacing: -0.5px; }
    .date { font-size: 14px; color: #888; font-weight: 500; margin-top: 4px; }
    
    /* LAYOUT GRID */
    .main-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex: 1;
    }

    .card {
      border: 1px solid #eee;
      border-radius: 16px;
      background: #fafafa;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #444;
      margin-bottom: 15px;
      border-left: 4px solid #4caf50;
      padding-left: 10px;
      text-transform: uppercase;
    }

    /* BAR CHART */
    .chart-wrapper {
        width: 100%;
        display: flex;
        justify-content: center;
    }
    .chart-svg { width: 100%; height: auto; max-height: ${chartHeight + padding * 2}px; }
    
    /* BOTTOM SECTION: SPLIT VIEW */
    .bottom-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        flex: 1; /* Fill remaining height */
    }

    /* PIE CHART */
    .pie-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    .pie-svg-wrapper { margin-bottom: 15px; }

    .legend-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        width: 100%;
    }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #555; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; }

    /* INSIGHTS PANEL */
    .insights-container {
        display: flex;
        flex-direction: column;
        gap: 15px;
        height: 100%;
        justify-content: center;
    }

    .stat-row {
        display: flex;
        gap: 15px;
    }

    .stat-box {
        flex: 1;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 15px;
        text-align: center;
    }

    .stat-value {
        font-size: 28px;
        font-weight: 800;
        color: #4caf50;
    }
    
    .stat-label {
        font-size: 11px;
        color: #888;
        font-weight: 600;
        text-transform: uppercase;
        margin-top: 5px;
    }

    .summary-box {
        background: #e8f5e9;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #c8e6c9;
    }
    
    .summary-text {
        font-size: 14px;
        color: #2e7d32;
        font-weight: 600;
        line-height: 1.5;
        font-style: italic;
    }

    /* CHART TEXT STYLES */
    .axis-label-y { font-size: 10px; fill: #888; text-anchor: end; }
    .axis-label-x { font-size: 10px; fill: #888; text-anchor: middle; }
    .bar-value { font-size: 10px; fill: #2e7d32; font-weight: 700; text-anchor: middle; }
    .grid-line { stroke: #eceff1; stroke-width: 1; stroke-dasharray: 4 4; }
    .axis-line { stroke: #e0e0e0; stroke-width: 1; }
    .bar { fill: #4caf50; }
    .bar-shadow { fill: rgba(76, 175, 80, 0.1); }

    .footer {
      text-align: center;
      margin-top: auto;
      padding-top: 15px;
      border-top: 1px solid #eee;
      color: #aaa;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="header">
        <div class="header-info">
            <div class="subtitle">${reportTitle} Report</div>
            <div class="date">${currentDate}</div>
        </div>
        ${logoSrc ? `<img class="logo-image" src="${logoSrc}" alt="Moody Logo" />` : ""}
    </div>
    
    <div class="main-content">
      
      <div class="card">
        <div class="card-title">Mood Trend</div>
        <div class="chart-wrapper">
          <svg class="chart-svg" viewBox="0 0 ${chartWidth + padding * 2} ${chartHeight + padding * 2}">
            ${Array.from({ length: 6 }, (_, i) => {
              const y = padding + (chartHeight / 5) * i;
              return `<line x1="${padding}" y1="${y}" x2="${chartWidth + padding}" y2="${y}" class="grid-line" />`;
            }).join("")}

            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${chartHeight + padding}" class="axis-line" />
            <line x1="${padding}" y1="${chartHeight + padding}" x2="${chartWidth + padding}" y2="${chartHeight + padding}" class="axis-line" />
            
            ${moodLabels
              .map((label, i) => {
                const y = padding + chartHeight - (chartHeight / 5) * i;
                return `<text x="${padding - 10}" y="${y + 3}" class="axis-label-y">${label}</text>`;
              })
              .join("")}
            
            ${labels
              .map((label, i) => {
                const x =
                  padding +
                  (chartWidth / xDivisions) * i +
                  chartWidth / (xDivisions * 2);
                return `<text x="${x}" y="${chartHeight + padding + 15}" class="axis-label-x">${label}</text>`;
              })
              .join("")}

            ${dataPoints
              .map((data, i) => {
                const slotWidth = chartWidth / xDivisions;
                const barWidth = Math.max(18, slotWidth * 0.5);
                const x = padding + slotWidth * i + (slotWidth - barWidth) / 2;
                const moodValue = Math.max(0, Math.min(5, data.mood || 0));
                const barHeight = (chartHeight / 5) * moodValue;
                const y = padding + chartHeight - barHeight;
                const shadowHeight = chartHeight / 5;
                const shadowY = padding + chartHeight - shadowHeight;

                return `
                  <rect x="${x}" y="${shadowY}" width="${barWidth}" height="${shadowHeight}" rx="4" class="bar-shadow" />
                  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" class="bar" />
                  ${moodValue > 0 ? `<text x="${x + barWidth / 2}" y="${y - 6}" class="bar-value">${moodValue.toFixed(1)}</text>` : ""}
                `;
              })
              .join("")}
          </svg>
        </div>
      </div>

      <div class="bottom-section">
        
        <div class="card pie-container">
            <div class="card-title" style="align-self: flex-start;">Distribution</div>
            <div class="pie-svg-wrapper">
                <svg width="${pieViewBoxSize}" height="${pieViewBoxSize}" viewBox="0 0 ${pieViewBoxSize} ${pieViewBoxSize}">
                    ${pieSlices}
                </svg>
            </div>
            <div class="legend-grid">
                ${pieData
                  .map(
                    (item) => `
                    <div class="legend-item">
                        <div class="legend-dot" style="background:${item.color || "#4caf50"}"></div>
                        <span>${item.label} (${item.percentage ?? 0}%)</span>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>

        <div class="card insights-container">
            <div class="card-title">Analysis</div>
            
            <div class="stat-row">
                <div class="stat-box">
                    <div class="stat-value">${averageScore}</div>
                    <div class="stat-label">Avg Mood</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${totalEntries}</div>
                    <div class="stat-label">Total Logs</div>
                </div>
            </div>

            <div class="stat-box" style="width: 100%;">
                <div class="stat-value" style="font-size: 20px;">${dominantMoodLabel}</div>
                <div class="stat-label">Dominant Feeling</div>
            </div>

            <div class="summary-box">
                <div class="summary-text">"${summaryText}"</div>
            </div>
        </div>

      </div>
    </div>
    
    <div class="footer">
      <div style="font-size: 14px; font-weight: 700; color: #4caf50;">Moody</div>
      <div>Track your emotions, understand yourself better</div>
      <div style="margin-top: 5px;">© ${new Date().getFullYear()} Moody. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
  `;
}

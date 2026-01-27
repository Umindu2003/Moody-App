import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { MOODS } from "../types/mood";

interface ExportData {
  period: string;
  insights: any;
  moodData: any[];
  comparison: any;
  distribution: any[];
}

export async function generateAndSharePDF(data: ExportData): Promise<void> {
  try {
    const htmlContent = generateHTMLContent(data);
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

function generateHTMLContent(data: ExportData): string {
  const { period, moodData } = data;
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate chart data for the week (Monday to Sunday)
  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const moodEmojis = ["😔", "😕", "😐", "😊", "😄"]; // 1-5 mood scale
  
  // Get current week data
  const today = new Date();
  const weekStart = new Date(today);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
  weekStart.setDate(today.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Calculate daily averages for the current week
  const dailyData = dayLabels.map((day, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    
    const dayEntries = moodData.filter((entry) => {
      const entryDate = entry.timestamp.toDate();
      return (
        entryDate.getDate() === dayDate.getDate() &&
        entryDate.getMonth() === dayDate.getMonth() &&
        entryDate.getFullYear() === dayDate.getFullYear()
      );
    });

    const avgMood = dayEntries.length > 0 
      ? dayEntries.reduce((sum, entry) => sum + entry.value, 0) / dayEntries.length
      : 0;

    return {
      day,
      mood: avgMood,
      emoji: avgMood > 0 ? moodEmojis[Math.round(avgMood) - 1] : "😐",
      entries: dayEntries.length
    };
  });

  const maxMood = 5;
  const chartHeight = 300;
  const chartWidth = 600;
  const padding = 80;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moody - Weekly Mood Chart</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 30px;
      background: #f8f9fa;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4caf50;
    }
    
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    .app-name {
      font-size: 36px;
      color: #4caf50;
      margin-bottom: 8px;
      font-weight: 700;
    }
    
    .subtitle {
      font-size: 18px;
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
      margin: 40px 0;
    }
    
    .chart-title {
      font-size: 24px;
      font-weight: 600;
      color: #333;
      margin-bottom: 30px;
    }
    
    .chart {
      position: relative;
      width: ${chartWidth + padding * 2}px;
      height: ${chartHeight + padding * 2}px;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      background: white;
      margin-bottom: 20px;
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
      stroke: #f0f0f0;
      stroke-width: 1;
    }
    
    .data-line {
      fill: none;
      stroke: #4caf50;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    
    .data-point {
      fill: #4caf50;
      stroke: white;
      stroke-width: 2;
      r: 6;
    }
    
    .mood-emoji {
      font-size: 20px;
      text-anchor: middle;
      dominant-baseline: middle;
    }
    
    .legend {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 10px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .legend-emoji {
      font-size: 24px;
    }
    
    .legend-text {
      font-size: 12px;
      color: #666;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      color: #999;
      font-size: 14px;
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
      <div class="logo">🌟</div>
      <h1 class="app-name">Moody</h1>
      <div class="subtitle">Weekly Mood Trend</div>
      <div class="date">Generated on ${currentDate}</div>
    </div>
    
    <div class="chart-container">
      <h2 class="chart-title">Your Mood This Week</h2>
      
      <div class="chart">
        <svg class="chart-svg" viewBox="0 0 ${chartWidth + padding * 2} ${chartHeight + padding * 2}">
          <!-- Grid lines -->
          ${Array.from({ length: 6 }, (_, i) => {
            const y = padding + (chartHeight / 5) * i;
            return `<line x1="${padding}" y1="${y}" x2="${chartWidth + padding}" y2="${y}" class="grid-line" />`;
          }).join('')}
          
          ${Array.from({ length: 8 }, (_, i) => {
            const x = padding + (chartWidth / 7) * i;
            return `<line x1="${x}" y1="${padding}" x2="${x}" y2="${chartHeight + padding}" class="grid-line" />`;
          }).join('')}
          
          <!-- Y-axis labels (moods) -->
          ${moodEmojis.map((emoji, i) => {
            const y = padding + chartHeight - (chartHeight / 5) * i;
            return `<text x="${padding - 20}" y="${y}" class="axis-label-y">${emoji}</text>`;
          }).join('')}
          
          <!-- X-axis labels (days) -->
          ${dayLabels.map((day, i) => {
            const x = padding + (chartWidth / 7) * i + (chartWidth / 14);
            return `<text x="${x}" y="${chartHeight + padding + 25}" class="axis-label-x">${day.substr(0, 3)}</text>`;
          }).join('')}
          
          <!-- Data line -->
          <polyline 
            points="${dailyData.map((data, i) => {
              const x = padding + (chartWidth / 7) * i + (chartWidth / 14);
              const y = data.mood > 0 ? 
                padding + chartHeight - (chartHeight / 5) * (data.mood - 1) :
                padding + chartHeight / 2;
              return `${x},${y}`;
            }).join(' ')}"
            class="data-line"
          />
          
          <!-- Data points -->
          ${dailyData.map((data, i) => {
            const x = padding + (chartWidth / 7) * i + (chartWidth / 14);
            const y = data.mood > 0 ? 
              padding + chartHeight - (chartHeight / 5) * (data.mood - 1) :
              padding + chartHeight / 2;
            return `<circle cx="${x}" cy="${y}" class="data-point" />`;
          }).join('')}
          
          <!-- Mood emojis at data points -->
          ${dailyData.map((data, i) => {
            const x = padding + (chartWidth / 7) * i + (chartWidth / 14);
            const y = data.mood > 0 ? 
              padding + chartHeight - (chartHeight / 5) * (data.mood - 1) - 25 :
              padding + chartHeight / 2 - 25;
            return `<text x="${x}" y="${y}" class="mood-emoji">${data.emoji}</text>`;
          }).join('')}
        </svg>
      </div>
      
      <!-- Legend -->
      <div class="legend">
        ${moodEmojis.map((emoji, i) => `
          <div class="legend-item">
            <span class="legend-emoji">${emoji}</span>
            <span class="legend-text">${i === 0 ? 'Very Sad' : i === 1 ? 'Sad' : i === 2 ? 'Neutral' : i === 3 ? 'Happy' : 'Very Happy'}</span>
          </div>
        `).join('')}
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
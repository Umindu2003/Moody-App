import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MOODS } from '../types/mood';

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
    const fileName = `Moody_Report_${data.period}_${new Date().toISOString().split('T')[0]}.html`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Write HTML file
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Share Mood Report',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

function generateHTMLContent(data: ExportData): string {
  const { period, insights, moodData, comparison, distribution } = data;
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Calculate additional stats
  const moodCounts: { [key: string]: number } = {};
  moodData.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moody - Mood Report</title>
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
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #4caf50;
    }
    
    .header h1 {
      font-size: 42px;
      color: #4caf50;
      margin-bottom: 10px;
      font-weight: 800;
    }
    
    .header .subtitle {
      font-size: 18px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .header .date {
      font-size: 14px;
      color: #999;
    }
    
    .period-badge {
      display: inline-block;
      background: #4caf50;
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
    }
    
    .section {
      margin: 30px 0;
      padding: 25px;
      background: #f8f9fa;
      border-radius: 15px;
      border-left: 5px solid #4caf50;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
    }
    
    .section-title::before {
      content: '📊';
      font-size: 28px;
      margin-right: 10px;
    }
    
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    
    .insight-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-top: 4px solid #4caf50;
    }
    
    .insight-value {
      font-size: 36px;
      font-weight: 800;
      color: #4caf50;
      margin: 10px 0;
    }
    
    .insight-label {
      font-size: 14px;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .comparison-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    
    .comparison-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .comparison-emoji {
      font-size: 60px;
      margin: 15px 0;
    }
    
    .comparison-label {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    
    .comparison-value {
      font-size: 28px;
      font-weight: 700;
      color: #4caf50;
    }
    
    .distribution-list {
      list-style: none;
      margin: 20px 0;
    }
    
    .distribution-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px;
      margin: 10px 0;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .distribution-item .emoji {
      font-size: 36px;
      margin-right: 15px;
    }
    
    .distribution-item .info {
      flex: 1;
      display: flex;
      align-items: center;
    }
    
    .distribution-item .bar-container {
      flex: 1;
      height: 30px;
      background: #f0f0f0;
      border-radius: 15px;
      overflow: hidden;
      margin: 0 15px;
      position: relative;
    }
    
    .distribution-item .bar {
      height: 100%;
      background: linear-gradient(90deg, #4caf50, #8bc34a);
      border-radius: 15px;
      transition: width 0.3s ease;
    }
    
    .distribution-item .percentage {
      font-size: 18px;
      font-weight: 700;
      color: #4caf50;
      min-width: 60px;
      text-align: right;
    }
    
    .mood-list {
      margin: 20px 0;
    }
    
    .mood-item {
      background: white;
      padding: 15px;
      margin: 10px 0;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: flex-start;
    }
    
    .mood-item .emoji {
      font-size: 36px;
      margin-right: 15px;
    }
    
    .mood-item .content {
      flex: 1;
    }
    
    .mood-item .mood-name {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
    }
    
    .mood-item .note {
      font-size: 14px;
      color: #666;
      font-style: italic;
      margin: 8px 0;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .mood-item .date {
      font-size: 12px;
      color: #999;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e0e0e0;
      color: #999;
      font-size: 14px;
    }
    
    .footer .logo {
      font-size: 24px;
      font-weight: 800;
      color: #4caf50;
      margin-bottom: 10px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌟 Moody</h1>
      <div class="subtitle">Your Mood Tracking Report</div>
      <div class="date">Generated on ${currentDate}</div>
      <div class="period-badge">${period.toUpperCase()} REPORT</div>
    </div>
    
    ${insights && insights.totalEntries > 0 ? `
    <div class="section">
      <h2 class="section-title">Key Insights</h2>
      <div class="insights-grid">
        <div class="insight-card">
          <div class="insight-value">${insights.averageMood.toFixed(1)}</div>
          <div class="insight-label">Average Mood</div>
          <div style="font-size: 12px; color: #999; margin-top: 5px;">out of 5.0</div>
        </div>
        
        <div class="insight-card">
          <div class="insight-value">${insights.currentStreak}</div>
          <div class="insight-label">Day Streak</div>
          <div style="font-size: 12px; color: #999; margin-top: 5px;">consecutive days</div>
        </div>
        
        <div class="insight-card">
          <div class="insight-value">${insights.totalEntries}</div>
          <div class="insight-label">Total Entries</div>
          <div style="font-size: 12px; color: #999; margin-top: 5px;">in this period</div>
        </div>
        
        <div class="insight-card">
          <div class="insight-value" style="font-size: 32px;">${getTrendEmoji(insights.moodTrend)}</div>
          <div class="insight-label">Mood Trend</div>
          <div style="font-size: 12px; color: ${getTrendColor(insights.moodTrend)}; margin-top: 5px; font-weight: 600;">
            ${insights.moodTrend}
          </div>
        </div>
      </div>
    </div>
    ` : ''}
    
    ${comparison ? `
    <div class="section">
      <h2 class="section-title">Period Comparison</h2>
      <div class="comparison-row">
        <div class="comparison-card">
          <div class="comparison-label">${comparison.previousLabel}</div>
          <div class="comparison-emoji">${comparison.previousMood ? comparison.previousMood.emoji : '😐'}</div>
          <div class="comparison-value">
            ${comparison.previousAvg > 0 ? comparison.previousAvg.toFixed(1) : 'No data'}
          </div>
        </div>
        
        <div class="comparison-card">
          <div class="comparison-label">${comparison.currentLabel}</div>
          <div class="comparison-emoji">${comparison.currentMood ? comparison.currentMood.emoji : '😐'}</div>
          <div class="comparison-value">
            ${comparison.currentAvg > 0 ? comparison.currentAvg.toFixed(1) : 'No data'}
          </div>
        </div>
      </div>
    </div>
    ` : ''}
    
    ${distribution && distribution.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Mood Distribution</h2>
      <ul class="distribution-list">
        ${distribution.map(item => `
          <li class="distribution-item">
            <span class="emoji">${item.name}</span>
            <div class="info">
              <div class="bar-container">
                <div class="bar" style="width: ${item.percentage}%"></div>
              </div>
              <span class="percentage">${item.percentage}%</span>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}
    
    ${moodData && moodData.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Recent Mood Entries</h2>
      <div class="mood-list">
        ${moodData.slice(0, 15).map(entry => `
          <div class="mood-item">
            <span class="emoji">${entry.emoji}</span>
            <div class="content">
              <div class="mood-name">${entry.mood}</div>
              ${entry.note ? `<div class="note">"${entry.note}"</div>` : ''}
              <div class="date">
                ${new Date(entry.timestamp.toDate()).toLocaleDateString()} at 
                ${new Date(entry.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <div class="footer">
      <div class="logo">Moody</div>
      <div>Track your emotions, understand yourself better</div>
      <div style="margin-top: 10px;">© ${new Date().getFullYear()} Moody. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
  `;
}

function getTrendEmoji(trend: string): string {
  switch (trend) {
    case 'improving': return '📈';
    case 'declining': return '📉';
    default: return '➡️';
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'improving': return '#4caf50';
    case 'declining': return '#f44336';
    default: return '#ffc107';
  }
}

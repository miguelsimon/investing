import { initNavigation } from './navigation.js';
import { fetchProblem } from './problemData.js';
import { renderGrowthChart, renderProblemSummary } from './problemView.js';

initNavigation('overview');

async function bootstrap() {
  const status = document.getElementById('status');
  const summary = document.getElementById('summary');
  const chartSection = document.getElementById('chart-section');
  const chart = document.getElementById('growth-chart');
  if (!status || !summary) {
    return;
  }

  try {
    const problem = await fetchProblem();
    status.textContent = 'Problem data loaded.';
    renderProblemSummary(summary, problem);
    summary.hidden = false;
    if (chartSection && chart) {
      const result = renderGrowthChart(chart, problem);
      chartSection.hidden = result === null;
    }
  } catch (error) {
    status.textContent = `Unable to load problem data. ${error.message}`;
    summary.hidden = true;
    if (chartSection) {
      chartSection.hidden = true;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

import { initNavigation } from './navigation.js';
import { fetchProblem } from './problemData.js';
import {
  findCommonDateRange,
  getTickers,
  renderGrowthChart,
  renderProblemSummary,
} from './problemView.js';

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
    const allTickers = getTickers(problem);
    const validTickers = new Set(allTickers);
    let selectedTickers = [];
    console.debug('[overview] problem loaded', { tickers: allTickers.length });

    let currentPlotHost = null;

    const destroyPlot = () => {
      if (currentPlotHost && globalThis.Plotly?.purge) {
        try {
          globalThis.Plotly.purge(currentPlotHost);
        } catch (purgeError) {
          console.warn('[overview] failed to purge chart host', purgeError);
        }
      }
      currentPlotHost = null;
    };

    const disableChart = (message, reason) => {
      if (!chart) {
        return;
      }
      destroyPlot();
      chart.innerHTML = '';
      chart.append(document.createTextNode(message));
      if (chartSection) {
        chartSection.hidden = false;
      }
      console.debug('[overview] chart disabled', { reason, selectedTickers });
    };
    let resizeAttached = false;
    const ensureResizeHandler = () => {
      if (resizeAttached || !chart) {
        return;
      }
      const handler = () => {
        if (globalThis.Plotly?.Plots?.resize && currentPlotHost) {
          globalThis.Plotly.Plots.resize(currentPlotHost);
        }
      };
      window.addEventListener('resize', handler, { passive: true });
      resizeAttached = true;
    };

    const updateChart = () => {
      if (!chart || !chartSection) {
        return;
      }
      console.debug('[overview] updateChart invoked', { selectedTickers });
      if (!selectedTickers.length) {
        disableChart('Select at least one ticker to display the chart.', 'no-selection');
        return;
      }
      const range = findCommonDateRange(problem, selectedTickers);
      if (!range) {
        disableChart(
          'Selected tickers do not share a common date range without missing data.',
          'range-missing',
        );
        return;
      }
      console.debug('[overview] rendering chart', { range });
      destroyPlot();
      chart.innerHTML = '';
      const host = document.createElement('div');
      host.className = 'growth-chart-host';
      chart.append(host);
      const result = renderGrowthChart(host, problem, {
        tickers: selectedTickers,
        startIndex: range.startIndex,
        endIndex: range.endIndex,
      });
      if (result === null) {
        chartSection.hidden = false;
        console.debug('[overview] renderGrowthChart returned null');
        return;
      }
      currentPlotHost = host;
      chartSection.hidden = false;
      ensureResizeHandler();
      console.debug('[overview] chart rendered');
    };

    const normalizeSelection = (tickers) => {
      if (!Array.isArray(tickers)) {
        return [];
      }
      const next = [];
      const seen = new Set();
      for (const ticker of tickers) {
        if (!validTickers.has(ticker) || seen.has(ticker)) {
          continue;
        }
        next.push(ticker);
        seen.add(ticker);
      }
      return next;
    };

    const setSelectedTickers = (tickers, source = 'unknown') => {
      const normalized = normalizeSelection(tickers);
      console.debug('[overview] setSelectedTickers', { source, requested: tickers, normalized });
      selectedTickers = normalized;
      updateChart();
    };

    setSelectedTickers(allTickers, 'initial');

    renderProblemSummary(summary, problem, {
      selectedTickers: [...selectedTickers],
      onSelectionChange: (tickerList) => {
        console.debug('[overview] selection change from summary', { tickerList });
        setSelectedTickers(tickerList, 'summary');
      },
    });
    summary.hidden = false;
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

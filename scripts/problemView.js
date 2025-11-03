export function getTickers(problem) {
  if (!problem || typeof problem !== 'object') {
    return [];
  }
  const prices = problem.price_in_constant_usd;
  if (!prices || typeof prices !== 'object') {
    return [];
  }
  return Object.keys(prices).sort();
}

export function getSymbolDescriptions(problem) {
  if (!problem || typeof problem !== 'object') {
    return {};
  }
  const descriptions = problem.symbol_descriptions;
  if (!descriptions || typeof descriptions !== 'object') {
    return {};
  }
  return { ...descriptions };
}

export function renderProblemSummary(container, problem) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('container must be an HTMLElement');
  }

  container.innerHTML = '';

  if (!problem) {
    container.appendChild(document.createTextNode('No problem data available.'));
    return container;
  }

  const tickers = getTickers(problem);
  const descriptions = getSymbolDescriptions(problem);
  const heading = document.createElement('h2');
  heading.textContent = 'Problem Overview';

  const list = document.createElement('ul');
  const daysItem = document.createElement('li');
  const days = Array.isArray(problem.days) ? problem.days.length : 0;
  daysItem.textContent = `Days covered: ${days}`;

  const constantDayItem = document.createElement('li');
  constantDayItem.textContent = `Constant USD day: ${problem.constant_usd_day ?? 'n/a'}`;

  const constantEurItem = document.createElement('li');
  constantEurItem.textContent = `Constant EUR day: ${problem.constant_eur_day ?? 'n/a'}`;

  list.append(daysItem, constantDayItem, constantEurItem);
  container.append(heading, list);

  if (tickers.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'No tickers available.';
    container.appendChild(emptyMessage);
    return container;
  }

  const table = document.createElement('table');
  table.className = 'ticker-table';
  table.style.marginTop = '12px';
  table.style.borderCollapse = 'collapse';
  table.style.minWidth = '320px';
  table.style.maxWidth = '720px';
  table.style.border = '1px solid #cbd5e1';

  const headerRow = document.createElement('tr');
  ['Ticker', 'Description'].forEach((text) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    th.style.textAlign = 'left';
    th.style.padding = '6px 10px';
    th.style.borderBottom = '1px solid #cbd5e1';
    th.style.borderRight = text === 'Ticker' ? '1px solid #cbd5e1' : 'none';
    headerRow.appendChild(th);
  });

  const thead = document.createElement('thead');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tickers.forEach((ticker) => {
    const row = document.createElement('tr');
    const tickerCell = document.createElement('td');
    tickerCell.textContent = ticker;
    tickerCell.style.padding = '6px 10px';
    tickerCell.style.borderRight = '1px solid rgba(148, 163, 184, 0.6)';
    tickerCell.style.borderBottom = '1px solid rgba(148, 163, 184, 0.6)';
    tickerCell.style.textAlign = 'left';
    row.appendChild(tickerCell);

    const descriptionCell = document.createElement('td');
    const description = descriptions[ticker];
    descriptionCell.textContent =
      typeof description === 'string' && description.trim() ? description.trim() : '—';
    descriptionCell.style.padding = '6px 10px';
    descriptionCell.style.borderBottom = '1px solid rgba(148, 163, 184, 0.6)';
    descriptionCell.style.textAlign = 'left';
    row.appendChild(descriptionCell);

    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}

export function normalizeSeries(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const firstValue = Number(values[0]);
  if (!Number.isFinite(firstValue) || firstValue === 0) {
    return values.map(() => Number.NaN);
  }

  return values.map((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric / firstValue : Number.NaN;
  });
}

export function buildGrowthTraces(problem) {
  const days = Array.isArray(problem?.days) ? problem.days : [];
  const prices = problem?.price_in_constant_usd ?? {};
  const tickers = getTickers(problem);
  const descriptions = getSymbolDescriptions(problem);
  const traces = [];

  for (const ticker of tickers) {
    const rawSeries = Array.isArray(prices[ticker]) ? prices[ticker] : [];
    if (rawSeries.length === 0 || days.length !== rawSeries.length) {
      continue;
    }

    const description = descriptions[ticker];
    const legendExtra = typeof description === 'string' && description.trim()
      ? `${ticker}: ${description.trim()}`
      : ticker;

    traces.push({
      name: ticker,
      x: days,
      y: normalizeSeries(rawSeries),
      type: 'scatter',
      mode: 'lines',
      hovertemplate:
        '<b>%{x}</b><br />growth: %{y:.2f}x<extra>' + legendExtra + '</extra>',
    });
  }

  return traces;
}

export function renderGrowthChart(container, problem, plotly = globalThis.Plotly) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('container must be an HTMLElement');
  }

  const traces = buildGrowthTraces(problem);
  if (!plotly || traces.length === 0) {
    container.innerHTML = '';
    container.append(document.createTextNode('Chart unavailable.'));
    return null;
  }

  const layout = {
    title: '$1 Constant-Dollar Growth',
    yaxis: { title: 'Growth factor (x)', rangemode: 'tozero' },
    xaxis: { title: 'Date' },
    legend: { orientation: 'v', x: 1.02, xanchor: 'left', y: 1, valign: 'top' },
    margin: { t: 50, r: 160, b: 50, l: 50 },
  };

  const config = {
    responsive: true,
  };

  return plotly.react(container, traces, layout, config);
}

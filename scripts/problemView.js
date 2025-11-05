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

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function findCommonDateRange(problem, tickers) {
  const days = Array.isArray(problem?.days) ? problem.days : [];
  if (!Array.isArray(tickers) || tickers.length === 0 || days.length === 0) {
    return null;
  }

  const prices = problem?.price_in_constant_usd ?? {};
  let startIndex = 0;
  let endIndex = days.length - 1;

  for (const ticker of tickers) {
    const series = Array.isArray(prices[ticker]) ? prices[ticker] : null;
    if (!series || series.length !== days.length) {
      return null;
    }

    let tickerStart = -1;
    let tickerEnd = -1;
    for (let i = 0; i < series.length; i += 1) {
      if (isFiniteNumber(series[i])) {
        tickerStart = i;
        break;
      }
    }
    for (let i = series.length - 1; i >= 0; i -= 1) {
      if (isFiniteNumber(series[i])) {
        tickerEnd = i;
        break;
      }
    }
    if (tickerStart === -1 || tickerEnd === -1 || tickerStart > tickerEnd) {
      return null;
    }
    for (let i = tickerStart; i <= tickerEnd; i += 1) {
      if (!isFiniteNumber(series[i])) {
        return null;
      }
    }

    startIndex = Math.max(startIndex, tickerStart);
    endIndex = Math.min(endIndex, tickerEnd);
    if (startIndex > endIndex) {
      return null;
    }
  }

  return { startIndex, endIndex };
}

export function getTickerDataStart(problem, ticker) {
  const days = Array.isArray(problem?.days) ? problem.days : [];
  const series = Array.isArray(problem?.price_in_constant_usd?.[ticker])
    ? problem.price_in_constant_usd[ticker]
    : null;
  if (!series || series.length !== days.length) {
    return null;
  }
  for (let i = 0; i < series.length; i += 1) {
    if (isFiniteNumber(series[i])) {
      return days[i];
    }
  }
  return null;
}

function normalizeTickerSelection(tickers, candidates) {
  if (!Array.isArray(tickers)) {
    return [];
  }
  const allowed = new Set(candidates);
  const next = [];
  const seen = new Set();
  tickers.forEach((ticker) => {
    if (!allowed.has(ticker) || seen.has(ticker)) {
      return;
    }
    next.push(ticker);
    seen.add(ticker);
  });
  return next;
}

export function renderTickerSelectionTable(problem, options = {}) {
  const { selectedTickers, onSelectionChange } = options;
  const tickers = getTickers(problem);
  const descriptions = getSymbolDescriptions(problem);

  if (tickers.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No tickers available.';
    return placeholder;
  }

  const table = document.createElement('table');
  table.className = 'ticker-table';
  table.style.marginTop = '12px';
  table.style.borderCollapse = 'collapse';
  table.style.minWidth = '480px';
  table.style.maxWidth = '960px';
  table.style.border = '1px solid #cbd5e1';

  const headerRow = document.createElement('tr');
  ['Selected', 'Ticker', 'Description', 'Data since'].forEach((text, index) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    th.style.textAlign = 'left';
    th.style.padding = '6px 10px';
    th.style.borderBottom = '1px solid #cbd5e1';
    th.style.borderRight = index < 3 ? '1px solid #cbd5e1' : 'none';
    th.style.whiteSpace = 'nowrap';
    headerRow.appendChild(th);
  });

  const thead = document.createElement('thead');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const tickerMetadata = tickers
    .map((ticker) => ({
      ticker,
      description: descriptions[ticker],
      dataSince: getTickerDataStart(problem, ticker),
    }))
    .sort((a, b) => {
      const aDate = a.dataSince ?? '';
      const bDate = b.dataSince ?? '';
      if (!aDate && !bDate) {
        return a.ticker.localeCompare(b.ticker);
      }
      if (!aDate) {
        return 1;
      }
      if (!bDate) {
        return -1;
      }
      if (aDate === bDate) {
        return a.ticker.localeCompare(b.ticker);
      }
      return aDate.localeCompare(bDate);
    });

  const orderedTickers = tickerMetadata.map((entry) => entry.ticker);

  const normalizedInitial = normalizeTickerSelection(selectedTickers, orderedTickers);
  const initialSelection = normalizedInitial.length > 0 ? normalizedInitial : [...orderedTickers];
  const selection = new Set(initialSelection);
  console.debug('[problemView] initial selection', initialSelection);
  const notifySelection = () => {
    if (typeof onSelectionChange === 'function') {
      onSelectionChange(Array.from(selection));
    }
  };

  const checkboxNodes = [];

  const applyRangeSelection = (targetIndex) => {
    selection.clear();
    tickerMetadata.forEach((entry, index) => {
      if (index <= targetIndex) {
        selection.add(entry.ticker);
      }
    });
    checkboxNodes.forEach((checkbox, index) => {
      checkbox.checked = index <= targetIndex;
    });
    notifySelection();
  };

  tickerMetadata.forEach(({ ticker, description, dataSince }, rowIndex) => {
    const row = document.createElement('tr');

    const selectCell = document.createElement('td');
    selectCell.style.padding = '6px 10px';
    selectCell.style.borderRight = '1px solid rgba(148, 163, 184, 0.6)';
    selectCell.style.borderBottom = '1px solid rgba(148, 163, 184, 0.6)';
    selectCell.style.textAlign = 'center';
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.justifyContent = 'center';
    controls.style.gap = '0.35rem';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selection.has(ticker);
    checkbox.dataset.ticker = ticker;
    checkboxNodes.push(checkbox);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selection.add(ticker);
      } else {
        selection.delete(ticker);
      }
      console.debug('[problemView] checkbox toggled', {
        ticker,
        checked: checkbox.checked,
        selection: Array.from(selection),
      });
      notifySelection();
    });
    controls.appendChild(checkbox);

    const upToButton = document.createElement('button');
    upToButton.type = 'button';
    upToButton.textContent = 'Select up to';
    upToButton.style.fontSize = '0.75rem';
    upToButton.style.padding = '2px 6px';
    upToButton.style.whiteSpace = 'nowrap';
    upToButton.addEventListener('click', () => {
      applyRangeSelection(rowIndex);
    });
    controls.appendChild(upToButton);

    selectCell.appendChild(controls);
    row.appendChild(selectCell);

    const tickerCell = document.createElement('td');
    tickerCell.textContent = ticker;
    tickerCell.style.padding = '6px 10px';
    tickerCell.style.borderRight = '1px solid rgba(148, 163, 184, 0.6)';
    tickerCell.style.borderBottom = '1px solid rgba(148, 163, 184, 0.6)';
    tickerCell.style.textAlign = 'left';
    row.appendChild(tickerCell);

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent =
      typeof description === 'string' && description.trim() ? description.trim() : '—';
    descriptionCell.style.padding = '6px 10px';
    descriptionCell.style.borderRight = '1px solid rgba(148, 163, 184, 0.6)';
    descriptionCell.style.borderBottom = '1px solid rgba(148, 163, 184, 0.6)';
    descriptionCell.style.textAlign = 'left';
    row.appendChild(descriptionCell);

    const dataSinceCell = document.createElement('td');
    dataSinceCell.textContent = dataSince ?? '—';
    dataSinceCell.style.padding = '6px 10px';
    dataSinceCell.style.borderBottom = '1px solid rgba(148, 163, 184, 0.6)';
    dataSinceCell.style.textAlign = 'left';
    dataSinceCell.style.whiteSpace = 'nowrap';
    row.appendChild(dataSinceCell);

    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  return table;
}

export function renderProblemSummary(container, problem, options = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('container must be an HTMLElement');
  }
  const { onSelectionChange, selectedTickers } = options;

  container.innerHTML = '';

  if (!problem) {
    container.appendChild(document.createTextNode('No problem data available.'));
    return container;
  }

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

  const table = renderTickerSelectionTable(problem, {
    selectedTickers,
    onSelectionChange,
  });
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

export function buildGrowthTraces(problem, options = {}) {
  const days = Array.isArray(problem?.days) ? problem.days : [];
  const prices = problem?.price_in_constant_usd ?? {};
  const selectedTickers = Array.isArray(options.tickers) && options.tickers.length > 0
    ? options.tickers
    : getTickers(problem);
  if (!days.length || !selectedTickers.length) {
    return [];
  }

  const startIndex = Math.max(0, Math.min(options.startIndex ?? 0, days.length - 1));
  const endIndex = Math.max(startIndex, Math.min(options.endIndex ?? days.length - 1, days.length - 1));
  const slicedDays = days.slice(startIndex, endIndex + 1);
  const descriptions = getSymbolDescriptions(problem);
  const traces = [];

  for (const ticker of selectedTickers) {
    const rawSeries = Array.isArray(prices[ticker]) ? prices[ticker] : [];
    if (rawSeries.length === 0 || days.length !== rawSeries.length) {
      continue;
    }
    const segment = rawSeries.slice(startIndex, endIndex + 1);
    if (segment.some((value) => !isFiniteNumber(value))) {
      continue;
    }

    const description = descriptions[ticker];
    const legendExtra = typeof description === 'string' && description.trim()
      ? `${ticker}: ${description.trim()}`
      : ticker;

    traces.push({
      name: ticker,
      x: slicedDays,
      y: normalizeSeries(segment),
      type: 'scatter',
      mode: 'lines',
      hovertemplate:
        '<b>%{x}</b><br />growth: %{y:.2f}x<extra>' + legendExtra + '</extra>',
    });
  }

  return traces;
}

function schedulePlotResize(container, plotlyInstance) {
  if (!container || !plotlyInstance?.Plots?.resize) {
    return;
  }
  const resize = () => {
    try {
      plotlyInstance.Plots.resize(container);
    } catch (_error) {
      // ignore resize errors
    }
  };
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(resize);
  } else {
    setTimeout(resize, 0);
  }
}

export function renderGrowthChart(container, problem, options = {}, plotly = globalThis.Plotly) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('container must be an HTMLElement');
  }

  const traces = buildGrowthTraces(problem, options);
  if (!plotly || traces.length === 0) {
    container.innerHTML = '';
    const message = typeof options.emptyMessage === 'string' && options.emptyMessage.trim()
      ? options.emptyMessage.trim()
      : 'Chart unavailable.';
    container.append(document.createTextNode(message));
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

  const result = plotly.react(container, traces, layout, config);
  schedulePlotResize(container, plotly);
  return result;
}

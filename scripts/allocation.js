import { initNavigation } from './navigation.js';
import { buildDayIndex, fetchProblem } from './problemData.js';
import { getTickers, getSymbolDescriptions } from './problemView.js';
import {
  computeRollingSimulations,
  normalizeWeights,
} from './simulation.js';

initNavigation('allocation');

const form = document.getElementById('allocation-form');
const lowerBoundInput = document.getElementById('lower-bound');
const upperBoundInput = document.getElementById('upper-bound');
const holdingInput = document.getElementById('holding-days');
const initialCapitalInput = document.getElementById('initial-capital');
const allocationList = document.getElementById('allocation-list');
const addAllocationButton = document.getElementById('add-allocation');
const editorTitle = document.getElementById('allocation-editor-title');
const weightsEditor = document.getElementById('weights-editor');
const editorSummary = document.getElementById('allocation-editor-summary');
const saveAllocationButton = document.getElementById('save-allocation');
const removeAllocationButton = document.getElementById('remove-allocation');
const statusNode = document.getElementById('allocation-status');
const chartSection = document.getElementById('allocation-chart-section');
const chartNode = document.getElementById('allocation-chart');
const violinSection = document.getElementById('allocation-violin-section');
const violinNode = document.getElementById('allocation-violin');
const currencyRadios = document.querySelectorAll('input[name="currency"]');

const DEFAULT_CURRENCY = 'USD';
const CURRENCY_LABELS = { USD: 'constant USD', EUR: 'constant EUR' };
const CURRENCY_UNITS = { USD: 'USD', EUR: 'EUR' };

let problem = null;
let dayLookup = new Map();
let tickers = [];
let symbolDescriptions = {};
let priceSeriesByCurrency = {};
let selectedCurrency = DEFAULT_CURRENCY;
const allocations = [];
let selectedAllocationId = null;
let isEditorDirty = false;
let allocationIdCounter = 1;
let allocationNameCounter = 1;
let runTimeoutId = null;

function setDateInputValue(input, value) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  if (!value) {
    input.value = '';
    return;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    input.value = value;
    if (input.value === value) {
      return;
    }
    const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
    if ([year, month, day].every(Number.isFinite)) {
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(candidate.getTime())) {
        input.valueAsDate = candidate;
      }
    }
    return;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(date?.getTime?.())) {
    input.valueAsDate = date;
  } else {
    input.value = '';
  }
}

function formatWeight(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '0';
  }
  return numeric.toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatPercentValue(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const magnitude = Math.abs(value);
  const precision = magnitude < 1 ? 2 : magnitude < 10 ? 1 : 0;
  return `${value.toFixed(precision)}%`;
}

function computePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return Number.NaN;
  }
  const clamped = Math.min(Math.max(percentile, 0), 100);
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0];
  }
  const rank = ((sorted.length - 1) * clamped) / 100;
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  const weight = rank - lowerIndex;
  return lower + (upper - lower) * weight;
}

function getPercentColor(value) {
  if (!Number.isFinite(value) || value === 0) {
    return 'inherit';
  }
  return value > 0 ? '#047857' : '#b91c1c';
}

function cloneWeights(weights) {
  const copy = {};
  Object.entries(weights ?? {}).forEach(([ticker, value]) => {
    copy[ticker] = Number(value) || 0;
  });
  return copy;
}

function buildEqualWeights() {
  const weights = {};
  if (tickers.length === 0) {
    return weights;
  }
  const equalWeight = 1 / tickers.length;
  tickers.forEach((ticker) => {
    weights[ticker] = equalWeight;
  });
  return weights;
}

function sanitizeWeights(weightMap) {
  const sanitized = {};
  tickers.forEach((ticker) => {
    const numeric = Number(weightMap?.[ticker]);
    sanitized[ticker] = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  });
  return sanitized;
}

function createAllocation(weightMap, { name, normalize = true } = {}) {
  let weights = sanitizeWeights(weightMap);
  if (normalize) {
    const { valid, weights: normalized } = normalizeWeights(weights);
    if (valid) {
      weights = cloneWeights(normalized);
    } else {
      const { weights: fallback } = normalizeWeights(buildEqualWeights());
      weights = cloneWeights(fallback);
    }
  }
  const allocation = {
    id: `allocation-${allocationIdCounter++}`,
    name: name ?? `Allocation ${allocationNameCounter++}`,
    weights,
  };
  allocations.push(allocation);
  return allocation;
}

function resolveSelectedCurrency() {
  const checked = Array.from(currencyRadios ?? []).find((radio) => radio.checked);
  const value = checked?.value ?? DEFAULT_CURRENCY;
  return value === 'EUR' ? 'EUR' : DEFAULT_CURRENCY;
}

function getCurrencyLabel(code) {
  return CURRENCY_LABELS[code] ?? code;
}

function getCurrencyUnit(code) {
  return CURRENCY_UNITS[code] ?? code;
}

function getPriceSeriesForCurrency(code) {
  return priceSeriesByCurrency[code] ?? null;
}

function buildConstantEurPrices(problemData) {
  const conversion = Array.isArray(problemData?.constant_usd_to_constant_eur)
    ? problemData.constant_usd_to_constant_eur
    : [];
  const days = Array.isArray(problemData?.days) ? problemData.days : [];
  const usdPrices = problemData?.price_in_constant_usd ?? {};
  if (conversion.length !== days.length || days.length === 0) {
    return null;
  }
  const result = {};
  Object.entries(usdPrices).forEach(([ticker, series]) => {
    if (!Array.isArray(series) || series.length !== days.length) {
      return;
    }
    result[ticker] = series.map((value, index) => {
      const price = Number(value);
      const factor = Number(conversion[index]);
      if (!Number.isFinite(price) || !Number.isFinite(factor)) {
        return Number.NaN;
      }
      return price * factor;
    });
  });
  return result;
}

function buildPriceSeries(problemData) {
  const usdPrices = problemData?.price_in_constant_usd ?? {};
  const eurPrices = buildConstantEurPrices(problemData);
  const map = { USD: usdPrices };
  if (eurPrices) {
    map.EUR = eurPrices;
  }
  return map;
}

function renderAllocationList() {
  allocationList.innerHTML = '';
  allocations.forEach((allocation) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.id = allocation.id;
    if (allocation.id === selectedAllocationId) {
      button.classList.add('selected');
    }
    const nameEl = document.createElement('strong');
    nameEl.textContent = allocation.name;
    button.appendChild(nameEl);
    button.appendChild(document.createElement('br'));

    const summaryEl = document.createElement('small');
    summaryEl.className = 'allocation-summary';
    const entries = Object.entries(allocation.weights ?? {}).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      summaryEl.textContent = 'No weights configured';
    } else {
      entries.forEach(([ticker, weight], index) => {
        const span = document.createElement('span');
        span.textContent = `${ticker} ${(weight * 100).toFixed(1)}%`;
        const description = symbolDescriptions[ticker];
        if (typeof description === 'string' && description.trim()) {
          span.title = description.trim();
          span.className = 'ticker-label';
        }
        summaryEl.appendChild(span);
        if (index < entries.length - 1) {
          summaryEl.appendChild(document.createTextNode(', '));
        }
      });
    }
    button.appendChild(summaryEl);
    item.appendChild(button);
    allocationList.appendChild(item);
  });
  removeAllocationButton.disabled = allocations.length <= 1;
}

function setEditorDirty(flag) {
  isEditorDirty = flag;
  saveAllocationButton.disabled = !flag;
}

function collectEditorWeights() {
  const weights = {};
  const inputs = weightsEditor.querySelectorAll('input[data-ticker]');
  inputs.forEach((input) => {
    const value = Number(input.value);
    weights[input.dataset.ticker] = Number.isFinite(value) && value >= 0 ? value : 0;
  });
  return weights;
}

function updateEditorSummaryFromInputs() {
  const weights = collectEditorWeights();
  const total = Object.values(weights).reduce((acc, value) => acc + value, 0);
  const normalized = Math.abs(total - 1) < 1e-3;
  editorSummary.textContent = `Current total weight: ${total.toFixed(3)}${normalized ? ' (normalized)' : ''}`;
  return { total, normalized };
}

function loadAllocationIntoEditor(allocation) {
  editorTitle.textContent = allocation.name;
  weightsEditor.innerHTML = '';
  tickers.forEach((ticker) => {
    const row = document.createElement('div');
    row.className = 'weight-row';
    const label = document.createElement('label');
    label.textContent = ticker;
    const description = symbolDescriptions[ticker];
    if (typeof description === 'string' && description.trim()) {
      label.title = description.trim();
      label.classList.add('ticker-label');
    }
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '1';
    input.step = 'any';
    input.dataset.ticker = ticker;
    input.value = formatWeight(allocation.weights[ticker] ?? 0);
    label.appendChild(input);
    row.appendChild(label);
    weightsEditor.appendChild(row);
  });
  setEditorDirty(false);
  updateEditorSummaryFromInputs();
}

function selectAllocation(allocationId, { force } = {}) {
  if (!force && isEditorDirty && allocationId !== selectedAllocationId) {
    updateEditorSummaryFromInputs();
    editorSummary.textContent += ' — save the allocation before switching.';
    return;
  }
  const allocation = allocations.find((entry) => entry.id === allocationId);
  if (!allocation) {
    return;
  }
  selectedAllocationId = allocation.id;
  renderAllocationList();
  loadAllocationIntoEditor(allocation);
}

function saveCurrentAllocation() {
  if (!selectedAllocationId) {
    return false;
  }
  const allocation = allocations.find((entry) => entry.id === selectedAllocationId);
  if (!allocation) {
    return false;
  }
  const rawWeights = collectEditorWeights();
  const { valid, weights } = normalizeWeights(rawWeights);
  if (!valid) {
    editorSummary.textContent = 'Weights must include at least one positive value before saving.';
    return false;
  }
  allocation.weights = cloneWeights(weights);
  loadAllocationIntoEditor(allocation);
  renderAllocationList();
  const { normalized } = updateEditorSummaryFromInputs();
  editorSummary.textContent += normalized ? ' — saved allocation.' : '';
  return true;
}

function removeCurrentAllocation() {
  if (allocations.length <= 1) {
    editorSummary.textContent = 'At least one allocation is required.';
    return false;
  }
  const index = allocations.findIndex((entry) => entry.id === selectedAllocationId);
  if (index === -1) {
    return false;
  }
  allocations.splice(index, 1);
  renderAllocationList();
  const nextIndex = index >= allocations.length ? allocations.length - 1 : index;
  const nextAllocation = allocations[nextIndex];
  selectedAllocationId = nextAllocation?.id ?? null;
  if (nextAllocation) {
    selectAllocation(nextAllocation.id, { force: true });
    editorSummary.textContent = 'Allocation removed.';
  } else {
    const fallback = createAllocation(buildEqualWeights());
    renderAllocationList();
    selectAllocation(fallback.id, { force: true });
  }
  return true;
}

function addAllocation() {
  if (allocations.length === 0) {
    return;
  }
  if (isEditorDirty) {
    editorSummary.textContent = 'Save the current allocation before adding a new one.';
    return;
  }
  const zeroWeights = {};
  tickers.forEach((ticker) => {
    zeroWeights[ticker] = 0;
  });
  const allocation = createAllocation(zeroWeights, { normalize: false });
  renderAllocationList();
  selectAllocation(allocation.id, { force: true });
  editorSummary.textContent = 'New allocation created. Adjust weights and save.';
}

function renderChart(seriesCollection, startCapital, currency) {
  if (!chartNode) {
    return;
  }
  if (!globalThis.Plotly || seriesCollection.length === 0) {
    if (chartSection) {
      chartSection.hidden = true;
    }
    return;
  }

  const denominator = startCapital > 0 ? startCapital : 1;
  const unit = getCurrencyUnit(currency);
  const label = getCurrencyLabel(currency);
  let minPercent = 0;
  let maxPercent = 0;
  const absolutePnL = [];

  const traces = seriesCollection.map((series, index) => {
    const xValues = series.map((entry) => entry.day);
    const pnlValues = series.map((entry) => entry.pnl);
    const pnlPercent = pnlValues.map((value) => (value / denominator) * 100);

    absolutePnL.push(...pnlValues);

    minPercent = Math.min(minPercent, ...pnlPercent);
    maxPercent = Math.max(maxPercent, ...pnlPercent);

    return {
      name: series.label ?? `Allocation ${index + 1}`,
      x: xValues,
      y: pnlValues,
      type: 'scatter',
      mode: 'lines',
      hovertemplate: `<b>%{x}</b><br />PnL: %{y:.2f} ${unit}<extra></extra>`,
    };
  });

  absolutePnL.push(0);
  let minValue = Math.min(...absolutePnL);
  let maxValue = Math.max(...absolutePnL);

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    minValue = 0;
    maxValue = 0;
  }
  if (minValue === maxValue) {
    const span = Math.max(Math.abs(minValue), 1);
    minValue -= span;
    maxValue += span;
  }

  const origin = 0;
  minValue = Math.min(minValue, origin);
  maxValue = Math.max(maxValue, origin);

  const tickTarget = 6;
  const span = maxValue - minValue;
  const step = span <= 0 ? 1 : span / (tickTarget - 1);
  const tickCandidates = [];
  for (let i = 0; i < tickTarget; i += 1) {
    tickCandidates.push(minValue + step * i);
  }
  tickCandidates.push(origin, maxValue);
  const valueTicks = Array.from(new Set(tickCandidates)).sort((a, b) => a - b);
  const percentTickText = valueTicks.map((tickValue) => {
    const percent = (tickValue / denominator) * 100;
    const magnitude = Math.abs(percent);
    const precision = magnitude < 1 ? 2 : magnitude < 10 ? 1 : 0;
    return `${percent.toFixed(precision)}%`;
  });
  console.debug('plot ticks', {
    minValue,
    maxValue,
    origin,
    valueTicks,
    percentTickText,
    denominator,
  });

  const stubX = valueTicks.map(() => seriesCollection[0][0]?.day ?? null);
  const y2StubTrace = {
    x: stubX,
    y: valueTicks,
    yaxis: 'y2',
    type: 'scatter',
    mode: 'lines',
    line: { width: 0 },
    hoverinfo: 'skip',
    showlegend: false,
  };

  const layout = {
    title: `Start-Day P&L (${label})`,
    xaxis: { title: 'Start day' },
    yaxis: { title: `PnL (${label})` },
    yaxis2: {
      title: 'PnL (%)',
      overlaying: 'y',
      side: 'right',
      tickmode: 'array',
      tickvals: valueTicks,
      ticktext: percentTickText,
      showgrid: false,
    },
    margin: { t: 50, r: 70, b: 60, l: 70 },
  };

  const config = { responsive: true };
  console.debug('renderChart', {
    count: seriesCollection.length,
    labels: traces.map((trace) => trace.name),
    currency,
  });
  globalThis.Plotly.react(chartNode, [...traces, y2StubTrace], layout, config);
  chartSection.hidden = false;
}

function renderViolin(seriesCollection, startCapital, currency) {
  if (!violinNode) {
    return;
  }
  if (!globalThis.Plotly || seriesCollection.length === 0) {
    if (violinSection) {
      violinSection.hidden = true;
    }
    return;
  }

  const labels = seriesCollection.map((series, index) => series.label ?? `Allocation ${index + 1}`);

  const traces = seriesCollection.map((series, index) => {
    const percentPnL = series.map((entry) => (entry.pnl / startCapital) * 100);
    const label = labels[index];
    return {
      name: label,
      type: 'violin',
      orientation: 'h',
      x: percentPnL,
      y: Array(percentPnL.length).fill(label),
      hovertemplate: '<b>' + label + '</b><br />PnL: %{x:.2f}%<extra></extra>',
      box: { visible: true },
      meanline: { visible: true },
      spanmode: 'hard',
    };
  });

  const layout = {
    title: `PnL Distribution (${getCurrencyLabel(currency)})`,
    xaxis: { title: 'PnL (%)' },
    yaxis: {
      showgrid: false,
      zeroline: false,
      autorange: 'reversed',
      categoryorder: 'array',
      categoryarray: labels,
    },
    violingap: 0.2,
    violingroupgap: 0.3,
    margin: { t: 50, r: 40, b: 60, l: 80 },
    legend: { orientation: 'h' },
  };

  const config = { responsive: true };
  console.debug('renderViolin', {
    count: seriesCollection.length,
    labels: traces.map((trace) => trace.name),
  });
  globalThis.Plotly.react(violinNode, traces, layout, config);
  violinSection.hidden = false;
}

function summarizeResults(results, startCapital, currency) {
  if (!statusNode) {
    return;
  }
  if (results.length === 0) {
    statusNode.textContent = 'No simulations were run. Adjust the inputs and try again.';
    return;
  }
  const currencyLabel = getCurrencyLabel(currency);
  const infoLine = document.createElement('div');
  infoLine.textContent = `Simulated ${results[0].length} windows per allocation (${currencyLabel}).`;

  const table = document.createElement('table');
  table.className = 'allocation-status__table';
  table.style.marginTop = '12px';
  table.style.borderCollapse = 'collapse';
  table.style.minWidth = '320px';
  table.style.maxWidth = '720px';
  table.style.fontSize = '0.95rem';
  table.style.border = '1px solid rgba(148, 163, 184, 0.6)';

  const headerRow = document.createElement('tr');
  ['Allocation', 'Mean %', 'Min %', '5th %'].forEach((heading, index) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = heading;
    th.style.textAlign = index === 0 ? 'left' : 'right';
    th.style.padding = '6px 10px';
    th.style.borderBottom = '1px solid #cbd5e1';
    if (index === 0) {
      th.style.borderRight = '1px solid rgba(148, 163, 184, 0.6)';
    }
    headerRow.appendChild(th);
  });

  const thead = document.createElement('thead');
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const denominator = startCapital > 0 ? startCapital : 1;

  results.forEach((series, index) => {
    const label = series.label ?? `Allocation ${index + 1}`;
    const percentPnls = series
      .map((entry) => (entry.pnl / denominator) * 100)
      .filter((value) => Number.isFinite(value));
    if (percentPnls.length === 0) {
      return;
    }
    const mean =
      percentPnls.reduce((acc, value) => acc + value, 0) / percentPnls.length;
    const min = Math.min(...percentPnls);
    const fifth = computePercentile(percentPnls, 5);

    const row = document.createElement('tr');
    const cellConfigs = [
      { text: label, align: 'left', scope: 'row' },
      { text: formatPercentValue(mean), align: 'right', color: getPercentColor(mean) },
      { text: formatPercentValue(min), align: 'right', color: getPercentColor(min) },
      { text: formatPercentValue(fifth), align: 'right', color: getPercentColor(fifth) },
    ];
    cellConfigs.forEach((config) => {
      const cell = document.createElement('td');
      if (config.scope) {
        cell.scope = config.scope;
      }
      cell.style.textAlign = config.align ?? 'right';
      cell.textContent = config.text;
      cell.style.padding = '6px 10px';
      cell.style.borderBottom = '1px solid rgba(148, 163, 184, 0.5)';
      if (config.align === 'left') {
        cell.style.borderRight = '1px solid rgba(148, 163, 184, 0.5)';
      }
      if (config.color) {
        cell.style.color = config.color;
      }
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });

  if (!tbody.hasChildNodes()) {
    statusNode.textContent = 'No simulations were run. Adjust the inputs and try again.';
    return;
  }

  table.appendChild(tbody);
  statusNode.replaceChildren(infoLine, table);
}

function parseDay(input, label) {
  const value = input?.value;
  if (!value) {
    throw new Error(`Missing ${label}`);
  }
  if (!dayLookup.has(value)) {
    throw new Error(`Day ${value} not found in problem data`);
  }
  return dayLookup.get(value);
}

function handleError(error) {
  if (statusNode) {
    statusNode.textContent = `Unable to run simulation: ${error.message}`;
  }
  if (chartSection) {
    chartSection.hidden = true;
  }
  if (violinSection) {
    violinSection.hidden = true;
  }
}

function scheduleRun() {
  if (runTimeoutId) {
    clearTimeout(runTimeoutId);
  }
  runTimeoutId = setTimeout(() => {
    runTimeoutId = null;
    runSimulations();
  }, 200);
}

async function runSimulations() {
  if (!problem) {
    return;
  }
  if (isEditorDirty) {
    handleError(new Error('Save the current allocation before running the simulation.'));
    return;
  }
  try {
    const initialCapital = Number(initialCapitalInput.value);
    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      throw new Error('Initial capital must be a positive number');
    }

    const holdingDays = Number.parseInt(holdingInput.value, 10);
    if (!Number.isFinite(holdingDays) || holdingDays <= 0) {
      throw new Error('Holding time must be a positive integer');
    }

    const lowerIndex = parseDay(lowerBoundInput, 'start day');
    const upperIndex = parseDay(upperBoundInput, 'end day');
    if (lowerIndex >= upperIndex) {
      throw new Error('Start day must come before end day');
    }

    const currency = resolveSelectedCurrency();
    selectedCurrency = currency;
    const priceSeries = getPriceSeriesForCurrency(currency);
    if (!priceSeries || Object.keys(priceSeries).length === 0) {
      throw new Error(`Problem data missing ${getCurrencyLabel(currency)} price series`);
    }

    const plottedSeries = [];
    allocations.forEach((allocation) => {
      const { valid, weights } = normalizeWeights(allocation.weights);
      if (!valid) {
        return;
      }
      const series = computeRollingSimulations(
        problem,
        initialCapital,
        weights,
        lowerIndex,
        upperIndex,
        holdingDays,
        priceSeries,
      );
      if (series.length > 0) {
        series.label = allocation.name;
        plottedSeries.push(series);
      }
    });

    console.debug(
      'plottedSeries',
      plottedSeries.map((series) => ({ label: series.label, points: series.length })),
      { currency },
    );
    summarizeResults(plottedSeries, initialCapital, currency);
    renderChart(plottedSeries, initialCapital, currency);
    renderViolin(plottedSeries, initialCapital, currency);
  } catch (error) {
    handleError(error);
  }
}

function initForm(problemData) {
  problem = problemData;
  dayLookup = buildDayIndex(problem.days);
  tickers = getTickers(problem);
  symbolDescriptions = getSymbolDescriptions(problem);
  priceSeriesByCurrency = buildPriceSeries(problem);
  selectedCurrency = resolveSelectedCurrency();
  allocations.length = 0;
  selectedAllocationId = null;
  allocationIdCounter = 1;
  const equalWeights = buildEqualWeights();
  const initialAllocation = createAllocation(equalWeights);
  renderAllocationList();
  selectAllocation(initialAllocation.id, { force: true });
  const firstDay = problem.days?.[0] ?? '';
  const lastDay = problem.days?.[problem.days.length - 1] ?? '';
  setDateInputValue(lowerBoundInput, firstDay);
  setDateInputValue(upperBoundInput, lastDay);
  if (typeof firstDay === 'string' && typeof lastDay === 'string') {
    lowerBoundInput.min = firstDay;
    lowerBoundInput.max = lastDay;
    upperBoundInput.min = firstDay;
    upperBoundInput.max = lastDay;
  }
  if (statusNode) {
    statusNode.textContent = `Simulation ready using ${getCurrencyLabel(selectedCurrency)}.`;
  }
}

async function bootstrap() {
  if (
    !form ||
    !lowerBoundInput ||
    !upperBoundInput ||
    !holdingInput ||
    !initialCapitalInput ||
    !allocationList ||
    !addAllocationButton ||
    !weightsEditor ||
    !saveAllocationButton ||
    !removeAllocationButton ||
    currencyRadios.length === 0
  ) {
    handleError(new Error('Allocation form inputs not found'));
    return;
  }
  try {
    const problemData = await fetchProblem();
    initForm(problemData);
    scheduleRun();
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });
    allocationList.addEventListener('click', (event) => {
      const target = event.target.closest('button[data-id]');
      if (!target) {
        return;
      }
      selectAllocation(target.dataset.id);
    });
    weightsEditor.addEventListener('input', (event) => {
      if (!(event.target instanceof HTMLInputElement)) {
        return;
      }
      if (!event.target.dataset.ticker) {
        return;
      }
      setEditorDirty(true);
      updateEditorSummaryFromInputs();
    });
    addAllocationButton.addEventListener('click', () => {
      addAllocation();
    });
    saveAllocationButton.addEventListener('click', () => {
      const saved = saveCurrentAllocation();
      if (saved) {
        scheduleRun();
      }
    });
    removeAllocationButton.addEventListener('click', () => {
      const removed = removeCurrentAllocation();
      if (removed) {
        scheduleRun();
      }
    });
    lowerBoundInput.addEventListener('change', scheduleRun);
    upperBoundInput.addEventListener('change', scheduleRun);
    holdingInput.addEventListener('change', scheduleRun);
    initialCapitalInput.addEventListener('change', scheduleRun);
    currencyRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        selectedCurrency = resolveSelectedCurrency();
        if (statusNode) {
          statusNode.textContent = `Currency switched to ${getCurrencyLabel(
            selectedCurrency,
          )}. Updating results...`;
        }
        if (chartSection) {
          chartSection.hidden = true;
        }
        if (violinSection) {
          violinSection.hidden = true;
        }
        scheduleRun();
      });
    });
  } catch (error) {
    handleError(error);
    if (form) {
      form.querySelectorAll('button, input').forEach((node) => {
        node.disabled = true;
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

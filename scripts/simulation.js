export function normalizeWeights(weightsMap) {
  let total = 0;
  const sanitized = {};

  for (const [ticker, weight] of Object.entries(weightsMap ?? {})) {
    const numeric = Number(weight);
    if (Number.isFinite(numeric) && numeric >= 0) {
      sanitized[ticker] = numeric;
      total += numeric;
    }
  }

  if (total <= 0) {
    return { valid: false, weights: {} };
  }

  const normalized = {};
  Object.entries(sanitized).forEach(([ticker, weight]) => {
    normalized[ticker] = weight / total;
  });
  const normalizedTotal = Object.values(normalized).reduce((acc, value) => acc + value, 0);
  const valid = Math.abs(normalizedTotal - 1) < 1e-6;
  return { valid, weights: normalized };
}

export function purchasePortfolio(startCapital, weights, priceData, startIndex) {
  if (!Number.isFinite(startCapital) || startCapital <= 0) {
    throw new Error('startCapital must be positive');
  }
  if (!Number.isInteger(startIndex) || startIndex < 0) {
    throw new Error('startIndex must be a non-negative integer');
  }

  const portfolio = {};
  for (const [ticker, weight] of Object.entries(weights ?? {})) {
    if (!Number.isFinite(weight) || weight <= 0) {
      continue;
    }
    const series = priceData?.[ticker];
    if (!Array.isArray(series)) {
      throw new Error(`missing price series for ${ticker}`);
    }
    const price = Number(series[startIndex]);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`invalid price for ${ticker} on index ${startIndex}`);
    }
    portfolio[ticker] = (startCapital * weight) / price;
  }

  if (Object.keys(portfolio).length === 0) {
    throw new Error('no positions created from weights');
  }

  return portfolio;
}

export function portfolioValue(portfolio, priceData, dayIndex) {
  if (!Number.isInteger(dayIndex) || dayIndex < 0) {
    throw new Error('dayIndex must be a non-negative integer');
  }

  let totalValue = 0;
  for (const [ticker, amount] of Object.entries(portfolio ?? {})) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`invalid amount for ${ticker}`);
    }
    const series = priceData?.[ticker];
    if (!Array.isArray(series)) {
      throw new Error(`missing price series for ${ticker}`);
    }
    const price = Number(series[dayIndex]);
    if (!Number.isFinite(price)) {
      throw new Error(`invalid price for ${ticker} on index ${dayIndex}`);
    }
    totalValue += amount * price;
  }
  return totalValue;
}

export function simulatePortfolio(
  problem,
  startIndex,
  endIndex,
  startCapital,
  weights,
  priceData,
) {
  if (!problem || !Array.isArray(problem.days)) {
    throw new Error('invalid problem data');
  }
  if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) {
    throw new Error('startIndex and endIndex must be integers');
  }
  if (startIndex < 0 || endIndex >= problem.days.length) {
    throw new Error('index range out of bounds');
  }
  if (endIndex < startIndex) {
    throw new Error('endIndex must be >= startIndex');
  }

  const prices = priceData ?? problem.price_in_constant_usd;
  if (!prices || typeof prices !== 'object') {
    throw new Error('missing price data for simulation');
  }

  const portfolio = purchasePortfolio(startCapital, weights, prices, startIndex);
  const dayIndexes = [];
  const days = [];
  const values = [];

  for (let idx = startIndex; idx <= endIndex; idx += 1) {
    const value = portfolioValue(portfolio, prices, idx);
    dayIndexes.push(idx);
    days.push(problem.days[idx]);
    values.push(value);
  }

  return { dayIndexes, days, values };
}

export function computeRollingSimulations(
  problem,
  startCapital,
  weights,
  lowerIndex,
  upperIndex,
  holdingDays,
  priceData,
) {
  if (!Number.isInteger(holdingDays) || holdingDays <= 0) {
    return [];
  }
  if (!Number.isInteger(lowerIndex) || !Number.isInteger(upperIndex)) {
    return [];
  }
  if (lowerIndex < 0 || upperIndex >= (problem?.days?.length ?? 0)) {
    return [];
  }
  if (!problem || !Array.isArray(problem.days)) {
    return [];
  }

  const results = [];
  for (let day = lowerIndex; day < upperIndex - holdingDays; day += 1) {
    const { dayIndexes, days, values } = simulatePortfolio(
      problem,
      day,
      day + holdingDays,
      startCapital,
      weights,
      priceData,
    );
    const endValue = values[values.length - 1];
    const minValue = Math.min(...values);
    results.push({
      dayIndex: day,
      day: days[0],
      dayIndexes,
      days,
      values,
      minValue,
      endValue,
      pnl: endValue - startCapital,
    });
  }

  return results;
}

function defaultProblemUrl() {
  if (typeof window === 'undefined' || !window.location) {
    return 'problem.json';
  }
  const base = window.location.pathname.replace(/[^/]*$/, '');
  return `${base}problem.json`;
}

export async function fetchProblem(url) {
  const requestUrl = url ?? defaultProblemUrl();
  const response = await fetch(requestUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to load problem: ${response.status}`);
  }
  return response.json();
}

export function buildDayIndex(days) {
  if (!Array.isArray(days)) {
    return new Map();
  }
  const lookup = new Map();
  days.forEach((day, index) => {
    lookup.set(day, index);
  });
  return lookup;
}

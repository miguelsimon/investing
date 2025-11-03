export async function fetchProblem(url = '/problem.json') {
  const response = await fetch(url, {
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

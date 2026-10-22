export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  let result = null;
  if (response.status !== 204) {
    try {
      result = await response.json();
    } catch {
      throw new ApiError(
        response.ok ? 'The API returned an invalid response.' : `The API service is unavailable (HTTP ${response.status}).`,
        response.status,
      );
    }
  }
  if (!response.ok) throw new ApiError(result?.error || 'The request could not be completed.', response.status);
  return result;
}

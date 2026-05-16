const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `API error ${response.status}`;

    try {
      const errorBody = await response.json();

      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch {
      // Si el backend no manda JSON, usamos el mensaje por status.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL;

  const token = localStorage.getItem("token");

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const errorBody = await response.json();

      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      } else if (typeof errorBody?.title === "string") {
        message = errorBody.title;
      }
    } catch {
      // Si la respuesta no viene en JSON, dejamos el mensaje por defecto.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
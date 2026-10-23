import 'server-only';

export const GRAPH_VERSION = 'v23.0';

// Llamada a la Graph API de Meta. Tira con el mensaje de error de Meta para mostrarlo en la UI.
export async function graph<T>(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.error_user_msg ?? data.error?.message ?? `Error de Meta en ${path}`);
  return data as T;
}

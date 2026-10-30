export const UNAUTHORIZED_EVENT = 'energia-viva:unauthorized';

export class ApiError extends Error {
  status: number;
  /** Erros por linha devolvidos pela importação de planilha. */
  lineErrors: { line: number; message: string }[];

  constructor(message: string, status: number, lineErrors: { line: number; message: string }[] = []) {
    super(message);
    this.status = status;
    this.lineErrors = lineErrors;
  }
}

/** Chamada JSON à API. Lança ApiError com a mensagem do servidor; 401 na área logada avisa o app. */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path.startsWith('/api/company')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(data.message || 'Erro inesperado. Tente novamente.', response.status, Array.isArray(data.errors) ? data.errors : []);
  }
  return data as T;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.');

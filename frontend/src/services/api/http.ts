// Feito com IA: a pasta services/api é o único lugar que fala com a API. Este arquivo faz a requisição
// (e, em caso de erro, lança um Error com a mensagem que o backend mandou); os outros módulos, um por
// área, convertem os nomes da API (português) para os nomes usados nas telas. Cada `Api...` descreve o
// JSON do backend; cada função devolve o tipo de types.ts.

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = { method?: string; body?: unknown };

// As rotas /api/conta/ usam a sessão do Django, que exige o token CSRF nos POST. O Django manda o
// token no cookie `csrftoken` (no GET /api/conta/) e espera recebê-lo de volta neste cabeçalho.
function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// Em /login e /cadastro ainda não houve nenhum GET /api/conta/, então o cookie pode não existir:
// busca antes (a resposta 401 não importa, só o cookie que vem junto).
export async function ensureCsrfCookie() {
  if (!csrfToken()) await fetch("/api/conta/").catch(() => {});
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken() },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor.", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.erro || `Erro ${response.status} no servidor.`, response.status);
  }
  return data as T;
}

// Mensagem de um erro capturado com `catch (e)` (que chega como `unknown`).
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Monta "?a=1&b=2" sem os parâmetros vazios.
export function queryString(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

import { vi } from "vitest";

type Resposta = { status?: number; corpo?: unknown } | Error;

// Feito com IA: troca o fetch global por um falso que devolve as respostas na ordem dada (um Error
// simula a rede caída). O Vitest roda em Node, sem navegador, então o `document` também é falso:
// services/api/http.ts só lê o cookie csrftoken dele. Desfaça com vi.unstubAllGlobals() no afterEach.
export function simularApi(respostas: Resposta[], cookie = "csrftoken=token-de-teste") {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const resposta of respostas) {
    if (resposta instanceof Error) {
      fetch.mockRejectedValueOnce(resposta);
    } else {
      fetch.mockResolvedValueOnce(new Response(JSON.stringify(resposta.corpo ?? {}), { status: resposta.status ?? 200 }));
    }
  }
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("document", { cookie });
  return fetch;
}

// URL, método, cabeçalhos e corpo (já convertido de JSON) da chamada número `n` ao fetch falso.
export function chamada(fetch: ReturnType<typeof simularApi>, n = 0) {
  const [url, init] = fetch.mock.calls[n];
  return {
    url: String(url),
    method: init?.method,
    headers: init?.headers as Record<string, string> | undefined,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  };
}

import type { Action } from "../../types";
import { request } from "./http";

export type ApiActions = {
  acoes: {
    tipo: string;
    titulo: string;
    descricao: string;
    mensagem: string;
    clientes: { nome: string; cpf: string; detalhe: string }[];
  }[];
};

export async function fetchActions(): Promise<Action[]> {
  const data = await request<ApiActions>("/api/acoes/");
  return data.acoes.map((a) => ({
    type: a.tipo,
    title: a.titulo,
    description: a.descricao,
    message: a.mensagem,
    clients: a.clientes.map((c) => ({ name: c.nome, cpf: c.cpf, detail: c.detalhe })),
  }));
}

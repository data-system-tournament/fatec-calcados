import type { ApiActions } from "../../services/api/acoes";

export const acoesApi: ApiActions = {
  acoes: [
    {
      tipo: "pontos_a_vencer",
      titulo: "Pontos a vencer",
      descricao: "Clientes com pontos que vencem nos próximos 60 dias.",
      mensagem: "Olá, Ana! Você tem 713 pontos que vencem em breve.",
      clientes: [{ nome: "Ana Souza", cpf: "***.982.247-**", detalhe: "713 pts até 02/11/2026" }],
    },
  ],
};

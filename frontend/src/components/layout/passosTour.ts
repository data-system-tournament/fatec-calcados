import { atalhoBusca } from "./navegacao";

// `alvo` é o valor do atributo data-tour do elemento da sidebar a destacar; sem ele o passo é um
// cartão centralizado (a boas-vindas).
export type PassoTour = { alvo?: string; titulo: string; texto: string };

// Feito com IA: os textos resumem o que cada tela faz hoje (ver CLAUDE.md); ao mudar uma tela, revise aqui.
export function passosDoTour(): PassoTour[] {
  return [
    {
      titulo: "Bem-vindo ao FATECalçados",
      texto: "Um passeio rápido pelo menu lateral mostra onde fica cada parte do programa de fidelidade.",
    },
    {
      alvo: "busca",
      titulo: "Busca",
      texto: `Encontre qualquer tela ou cliente em segundos. Atalho: ${atalhoBusca()}.`,
    },
    {
      alvo: "/admin/pdv",
      titulo: "PDV / Caixa",
      texto:
        "Registre vendas, identifique o cliente e use os pontos no pagamento. Se a conexão cair, as vendas ficam numa fila e são enviadas quando ela volta.",
    },
    {
      alvo: "/admin/dashboard",
      titulo: "Dashboard",
      texto: "Os números do programa por período: vendas, pontos e clientes.",
    },
    {
      alvo: "/admin/clientes",
      titulo: "Clientes",
      texto: "A lista de clientes com nível e saldo de pontos. Abra um cliente para ver o perfil completo.",
    },
    {
      alvo: "/admin/vendas",
      titulo: "Vendas",
      texto: "O histórico de vendas, com o detalhe de cada uma.",
    },
    {
      alvo: "/admin/acoes",
      titulo: "Ações",
      texto: "Listas de ações para a gestão. Marque as que você já fez; o número no menu mostra quantas ainda estão pendentes.",
    },
    {
      alvo: "/admin/avaliacoes",
      titulo: "Avaliações",
      texto: "O que os clientes acharam dos produtos: nota média, nota por produto e os comentários. Clique num produto para ler só os dele.",
    },
    {
      alvo: "conexao",
      titulo: "Status do caixa",
      texto: "Mostra se este caixa está conectado. Offline, as vendas continuam sendo registradas e ficam pendentes até a conexão voltar.",
    },
    {
      alvo: "acessibilidade",
      titulo: "Aparência e acessibilidade",
      texto: "Escolha o tema claro, escuro ou do sistema, aumente a letra, ligue o alto contraste e mais. As escolhas ficam salvas neste navegador.",
    },
  ];
}

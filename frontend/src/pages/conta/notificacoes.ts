import type { ClientDashboard } from "../../types";
import { formatDay, formatNumber, plural } from "../../utils/format";

export type TipoDeNotificacao = "aniversario" | "vencendo" | "avaliar" | "nivel" | "perfil";

export type Notificacao = { id: string; tipo: TipoDeNotificacao; titulo: string; texto: string; link: string };

// O mesmo corte da lista "Perto de subir de nível" que o gerente vê em Ações (acoes.PONTOS_PARA_SUBIR).
export const PONTOS_PARA_SUBIR = 300;

// Feito com IA: as notificações do cliente saem do painel que a área do cliente já carrega (nada é gravado
// no banco). O `id` muda quando a situação muda (outra data de vencimento, uma compra nova para avaliar),
// e é isso que faz o aviso voltar como não lido. Ordem: o que tem prazo primeiro, o perfil por último.
export function montarNotificacoes(account: ClientDashboard, hoje: Date): Notificacao[] {
  const lista: Notificacao[] = [];
  const primeiroNome = account.name.trim().split(/\s+/)[0];

  if (account.birthDate && fazAniversario(account.birthDate, hoje)) {
    lista.push({
      id: `aniversario:${hoje.getFullYear()}`,
      tipo: "aniversario",
      titulo: `Feliz aniversário, ${primeiroNome}!`,
      texto: "A equipe FATECalçados deseja um ótimo dia para você.",
      link: "/loja",
    });
  }

  const { expiring } = account;
  if (expiring.points > 0 && expiring.nextDate) {
    lista.push({
      id: `vencendo:${expiring.nextDate}`,
      tipo: "vencendo",
      titulo: `${formatNumber(expiring.points)} pts vencem em breve`,
      texto: `O primeiro lote vence em ${formatDay(expiring.nextDate)}. Use os pontos na próxima compra.`,
      link: "/minha-conta#pontos",
    });
  }

  const { pendingReviews } = account;
  if (pendingReviews.count > 0) {
    lista.push({
      id: `avaliar:${pendingReviews.lastPurchase}`,
      tipo: "avaliar",
      titulo: `${pendingReviews.count} ${plural(pendingReviews.count, "produto", "produtos")} para avaliar`,
      texto: `Conte o que achou do que comprou e ganhe ${formatNumber(pendingReviews.points)} pts.`,
      link: "/minha-conta/avaliacoes",
    });
  }

  if (account.nextLevel && account.nextLevel.missing <= PONTOS_PARA_SUBIR) {
    lista.push({
      id: `nivel:${account.nextLevel.name}`,
      tipo: "nivel",
      titulo: `Falta pouco para o nível ${account.nextLevel.name}`,
      texto: `Faltam ${formatNumber(account.nextLevel.missing)} pts acumulados em 12 meses para você subir de nível.`,
      link: "/minha-conta#pontos",
    });
  }

  const faltando = dadosFaltando(account);
  if (faltando) {
    lista.push({
      id: `perfil:${faltando}`,
      tipo: "perfil",
      titulo: "Complete seu perfil",
      texto: `Informe ${faltando} para receber ofertas feitas para você.`,
      link: "/minha-conta#dados",
    });
  }

  return lista;
}

// "sua numeração", "sua data de aniversário", as duas juntas, ou "" se o perfil está completo.
export function dadosFaltando(account: Pick<ClientDashboard, "shoeSize" | "birthDate">): string {
  const faltando = [
    account.shoeSize === null && "sua numeração",
    account.birthDate === null && "sua data de aniversário",
  ].filter(Boolean);
  return faltando.join(" e ");
}

// Compara só dia e mês ("AAAA-MM-DD" lido como texto, sem passar por fuso horário).
function fazAniversario(nascimento: string, hoje: Date): boolean {
  const [, mes, dia] = nascimento.split("-").map(Number);
  return mes === hoje.getMonth() + 1 && dia === hoje.getDate();
}

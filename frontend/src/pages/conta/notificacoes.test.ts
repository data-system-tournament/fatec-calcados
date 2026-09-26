import { describe, expect, it } from "vitest";
import { toClientDashboard } from "../../services/api/conta";
import { painelDoClienteApi } from "../../testes/dados/conta";
import type { ClientDashboard } from "../../types";
import { dadosFaltando, montarNotificacoes, PONTOS_PARA_SUBIR } from "./notificacoes";

// Painel dos dados mocados: pontos vencendo, a meia para avaliar, perfil completo e longe do Ouro.
const painel = toClientDashboard(painelDoClienteApi);
const umDiaQualquer = new Date(2026, 8, 26);

function tipos(account: ClientDashboard, hoje = umDiaQualquer) {
  return montarNotificacoes(account, hoje).map((n) => n.tipo);
}

describe("notificações do cliente", () => {
  it("avisa dos pontos vencendo e do que falta avaliar, com o link de cada tela", () => {
    const lista = montarNotificacoes(painel, umDiaQualquer);
    expect(lista.map((n) => [n.tipo, n.link])).toEqual([
      ["vencendo", "/minha-conta#pontos"],
      ["avaliar", "/minha-conta/avaliacoes"],
    ]);
    expect(lista[1]).toMatchObject({ titulo: "1 produto para avaliar", texto: expect.stringContaining("20 pts") });
  });

  it("sem nada pendente, não há notificação", () => {
    const tranquilo = {
      ...painel,
      expiring: { ...painel.expiring, points: 0, nextDate: null },
      pendingReviews: { count: 0, points: 0, lastPurchase: null },
    };
    expect(tipos(tranquilo)).toEqual([]);
  });

  it("perfil sem numeração ou aniversário pede para completar", () => {
    const semDados = { ...painel, shoeSize: null, birthDate: null };
    const perfil = montarNotificacoes(semDados, umDiaQualquer).at(-1);
    expect(perfil).toMatchObject({ tipo: "perfil", link: "/minha-conta#dados" });
    expect(perfil?.texto).toContain("sua numeração e sua data de aniversário");
    expect(dadosFaltando({ shoeSize: 38, birthDate: null })).toBe("sua data de aniversário");
    expect(dadosFaltando({ shoeSize: 38, birthDate: "1990-01-01" })).toBe("");
  });

  it("parabeniza só no dia do aniversário, sem depender do ano", () => {
    expect(tipos(painel, new Date(2026, 9, 14))[0]).toBe("aniversario");
    expect(tipos(painel, new Date(2026, 9, 15))).not.toContain("aniversario");
  });

  it("avisa quando faltam poucos pontos para o próximo nível (mesmo corte das Ações)", () => {
    const perto = { ...painel, nextLevel: { name: "Ouro", missing: PONTOS_PARA_SUBIR } };
    expect(tipos(perto)).toContain("nivel");
    expect(tipos({ ...perto, nextLevel: { name: "Ouro", missing: PONTOS_PARA_SUBIR + 1 } })).not.toContain("nivel");
  });

  it("o id muda quando a situação muda, para o aviso voltar como não lido", () => {
    const antes = montarNotificacoes(painel, umDiaQualquer)[1].id;
    const compraNova = { ...painel, pendingReviews: { ...painel.pendingReviews, lastPurchase: "2026-09-25T10:00:00-03:00" } };
    expect(montarNotificacoes(compraNova, umDiaQualquer)[1].id).not.toBe(antes);
  });
});

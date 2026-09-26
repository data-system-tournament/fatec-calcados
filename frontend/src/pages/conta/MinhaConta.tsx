import { useLocation, useNavigate } from "react-router-dom";
import { Abas } from "../../components/ui/Abas";
import { Card } from "../../components/ui/Card";
import { LevelBadge } from "../../components/ui/LevelBadge";
import { useConta } from "../../contexts/conta";
import type { ClientDashboard } from "../../types";
import { formatDay } from "../../utils/format";
import Extrato from "./Extrato";
import MeusDados from "./MeusDados";
import MeusPontos from "./MeusPontos";
import { ProgressoDoNivel } from "./pecas";

const ABAS = [
  { valor: "pontos", rotulo: "Pontos" },
  { valor: "extrato", rotulo: "Extrato" },
  { valor: "dados", rotulo: "Meus dados" },
] as const;
type Aba = (typeof ABAS)[number]["valor"];

// "Minha conta › Meu perfil", como o "Meu perfil" do Mercado Livre: quem é o cliente e o nível em cima e,
// embaixo, uma aba por assunto, para a página não virar um painel com tudo de uma vez. As compras têm
// tela própria na sidebar, como os pedidos dessas lojas.
function MinhaConta() {
  const { account } = useConta();
  const [aba, trocarAba] = useAbaNaUrl();
  if (!account) return null;

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center justify-between gap-5 p-[18px]">
        <div className="flex items-center gap-4">
          <span className="grid size-14 flex-none place-items-center rounded-full bg-violeta-soft text-lg font-semibold text-violeta" aria-hidden>
            {iniciais(account.name)}
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2.5 text-xl font-semibold tracking-[-.015em]">
              {account.name} <LevelBadge level={account.level} />
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Cliente desde {formatDay(account.registeredAt)}
              {account.bonusPercent > 0 && ` · ganha ${account.bonusPercent}% a mais de pontos por ser ${account.level}`}
            </p>
          </div>
        </div>
        <div className="w-[300px] max-w-full">
          <ProgressoDoNivel account={account} />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Abas abas={ABAS} valor={aba} onChange={trocarAba} rotulo="Seções do perfil" idBase="perfil" />
        <div id="perfil-painel" role="tabpanel" aria-labelledby={`perfil-${aba}`}>
          {aba === "pontos" && <MeusPontos account={account} />}
          {aba === "extrato" && <Extrato account={account} />}
          {aba === "dados" && <MeusDados account={account} />}
        </div>
      </div>
    </div>
  );
}

// A aba fica no #hash da URL: /minha-conta#dados abre direto nos dados (os endereços antigos
// /minha-conta/pontos e /minha-conta/dados redirecionam para cá). Trocar de aba não cria entrada no
// histórico (replace), então o voltar do navegador sai da página em vez de passar pelas abas.
function useAbaNaUrl(): [Aba, (aba: Aba) => void] {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const aba = ABAS.find((a) => `#${a.valor}` === hash)?.valor ?? "pontos";
  return [aba, (nova) => navigate({ hash: nova }, { replace: true })];
}

function iniciais(nome: ClientDashboard["name"]): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export default MinhaConta;

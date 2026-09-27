import { Plus } from "lucide-react";
import { createElement, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { corDoNivel } from "../../components/ui/corDoNivel";
import { useConta } from "../../contexts/conta";
import { useToast } from "../../contexts/toast";
import type { ClientDashboard } from "../../types";
import { formatMoney, formatNumber } from "../../utils/format";
import { TONS, type Tom } from "../dashboard/tons";
import { iconeDoProduto } from "../pdv/categorias";

// Peças usadas em mais de uma tela da área do cliente (Produtos e Meu perfil).

export function Indicador({ tom, icone, rotulo, valor, detalhe }: {
  tom: Tom;
  icone: ReactNode;
  rotulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-[18px]">
      <span className="flex items-center gap-2 text-[13px] text-muted">
        <span className={`grid size-7 place-items-center rounded-md ${TONS[tom].chip}`} aria-hidden>{icone}</span>
        {rotulo}
      </span>
      <strong className="mt-1 text-[24px] leading-[1.2] font-semibold tracking-[-.02em] tabular-nums">{valor}</strong>
      <small className="text-xs text-faint">{detalhe}</small>
    </Card>
  );
}

// Barra até o próximo nível, pintada com a cor do nível que vem (ou do atual, no nível máximo).
export function ProgressoDoNivel({ account }: { account: ClientDashboard }) {
  const next = account.nextLevel;
  return (
    <div className="text-[13px]">
      <div className="flex justify-between text-muted">
        <span>{formatNumber(account.points12m)} pts em 12 meses</span>
        <span>{account.levelProgress}%</span>
      </div>
      <div
        className="my-1.5 h-2.5 overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-valuenow={account.levelProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso até o próximo nível"
      >
        <div
          className={`h-full rounded-full ${corDoNivel(next ? next.name : account.level)}`}
          style={{ width: `${account.levelProgress}%` }}
        />
      </div>
      <small className="text-xs text-faint">
        {next ? `Faltam ${formatNumber(next.missing)} pts para o nível ${next.name}` : "Você está no nível máximo"}
      </small>
    </div>
  );
}

// "Compre de novo": os produtos que o cliente mais compra. O acessório vai direto para o carrinho; o calçado
// abre a página do produto, porque precisa escolher a numeração (e ver se ela tem em estoque).
export function CompreDeNovo({ account }: { account: ClientDashboard }) {
  const { addToCart, products } = useConta();
  const notify = useToast();
  if (account.topProducts.length === 0) return null;

  return (
    <ul className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
      {account.topProducts.map((product) => {
        const catalogo = products.find((p) => p.sku === product.sku);
        return (
          <li key={product.sku} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
            <Link to={`/loja/produto/${product.sku}`} className="min-w-0 hover:underline">
              <span className="block truncate text-[13.5px] font-medium">{product.name}</span>
              <small className="text-xs text-muted">
                {formatMoney(product.price)} · comprou {product.units}×
              </small>
            </Link>
            {catalogo?.usesSizes ? (
              <Link
                to={`/loja/produto/${product.sku}`}
                className="flex-none rounded-md border border-line-2 px-2.5 py-1 text-[12.5px] font-medium hover:border-ink"
              >
                Escolher nº
              </Link>
            ) : (
              <Button
                size="sm"
                aria-label={`Adicionar ${product.name} ao carrinho`}
                disabled={!catalogo || catalogo.stock === 0}
                onClick={() => {
                  addToCart(product.sku, null);
                  notify(`${product.name} no carrinho`);
                }}
              >
                <Plus size={14} aria-hidden />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Feito com IA: foto do produto (cards da loja e avaliações). Sem foto cadastrada, ou se ela não carregar
// (sem internet, link quebrado), mostra o ícone da categoria no fundo --foto, como antes. O alt fica vazio
// porque o nome do produto já está escrito ao lado; a foto é só ilustração.
export function FotoDoProduto({ nome, foto, tamanhoIcone }: { nome: string; foto: string | null; tamanhoIcone: number }) {
  const [falhou, setFalhou] = useState(false);
  if (foto && !falhou) {
    return <img src={foto} alt="" loading="lazy" decoding="async" onError={() => setFalhou(true)} className="size-full object-cover" />;
  }
  // createElement: o ícone é um componente fixo do lucide escolhido pela categoria, não criado aqui.
  return createElement(iconeDoProduto(nome), { size: tamanhoIcone, strokeWidth: 1.3, className: "text-faint", "aria-hidden": true });
}

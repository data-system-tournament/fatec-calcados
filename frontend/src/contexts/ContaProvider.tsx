import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { errorMessage, fetchAccount, fetchProducts, signOut as apiSignOut } from "../services/api";
import type { CartItem, ClientDashboard, Product } from "../types";
import { mudarQuantidade, somarAoCarrinho, tirarDoCarrinho } from "../utils/carrinho";
import { ContaContext } from "./conta";

const CART_KEY = "fatec:carrinho-online";

// O carrinho sobrevive a um recarregamento da página. localStorage pode falhar (aba anônima, bloqueio):
// aí o carrinho só vive na memória.
function readCart(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    // Carrinho salvo antes do estoque por numeração não tem `size`: vira null, e o item de calçado sem número
    // é tirado quando o catálogo chega (no efeito que busca os produtos).
    return Array.isArray(saved) ? saved.map((item: CartItem) => ({ ...item, size: item.size ?? null })) : [];
  } catch {
    return [];
  }
}

// Feito com IA: o login (/login, /cadastro) já devolve o painel e o manda no state da navegação. Com ele, a
// área abre na hora em vez de esperar o mesmo painel de novo; a busca normal roda do mesmo jeito, por trás,
// para o painel nunca ficar velho (o state sobrevive a um F5).
function contaDoLogin(state: unknown): ClientDashboard | null {
  return (state as { conta?: ClientDashboard } | null)?.conta ?? null;
}

export function ContaProvider({ children }: { children: ReactNode }) {
  const { state } = useLocation();
  const [account, setAccount] = useState<ClientDashboard | null>(() => contaDoLogin(state));
  const [loading, setLoading] = useState(() => contaDoLogin(state) === null);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(readCart);

  const load = useCallback(
    () =>
      fetchAccount()
        .then((data) => {
          setAccount(data);
          setError("");
        })
        .catch((e: unknown) => setError(errorMessage(e)))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    load();
    fetchProducts()
      .then((lista) => {
        setProducts(lista);
        // Com o catálogo, dá para saber quais itens são calçado: o que ficou sem numeração (carrinho salvo antes
        // do estoque por numeração) sai, porque não dá para comprá-lo sem escolher o número.
        const calcados = new Set(lista.filter((p) => p.usesSizes).map((p) => p.sku));
        setCart((current) => {
          const validos = current.filter((item) => item.size !== null || !calcados.has(item.sku));
          return validos.length === current.length ? current : validos;
        });
      })
      .catch(() => setProducts([]));
  }, [load]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // sem localStorage: segue só na memória
    }
  }, [cart]);

  const signOut = useCallback(async () => {
    await apiSignOut().catch(() => {});
    setAccount(null);
    setCart([]);
    // Apaga o carrinho salvo aqui mesmo: quem sai pode estar indo para outra página, e o efeito que salva
    // o carrinho não roda mais depois que o provider desmonta.
    try {
      localStorage.removeItem(CART_KEY);
    } catch {
      // sem localStorage: nada salvo
    }
  }, []);

  function addToCart(sku: string, size: number | null, quantity = 1) {
    setCart((current) => somarAoCarrinho(current, sku, size, quantity));
  }

  function changeQuantity(chave: string, change: number) {
    setCart((current) => mudarQuantidade(current, chave, change));
  }

  function removeFromCart(chave: string) {
    setCart((current) => tirarDoCarrinho(current, chave));
  }

  return (
    <ContaContext.Provider
      value={{
        account,
        loading,
        error,
        reload,
        signOut,
        products,
        cart,
        addToCart,
        changeQuantity,
        removeFromCart,
        clearCart: () => setCart([]),
      }}
    >
      {children}
    </ContaContext.Provider>
  );
}

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { errorMessage, fetchAccount, fetchProducts, signOut as apiSignOut } from "../services/api";
import type { CartItem, ClientDashboard, Product } from "../types";
import { ContaContext } from "./conta";

const CART_KEY = "fatec:carrinho-online";

// O carrinho sobrevive a um recarregamento da página. localStorage pode falhar (aba anônima, bloqueio):
// aí o carrinho só vive na memória.
function readCart(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function ContaProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<ClientDashboard | null>(null);
  const [loading, setLoading] = useState(true);
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
    fetchProducts().then(setProducts).catch(() => setProducts([]));
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

  function addToCart(product: Product) {
    setCart((current) =>
      current.some((item) => item.sku === product.sku)
        ? current.map((item) => (item.sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item))
        : [...current, { sku: product.sku, quantity: 1 }],
    );
  }

  function changeQuantity(sku: string, change: number) {
    setCart((current) =>
      current.map((item) => (item.sku === sku ? { ...item, quantity: Math.max(1, item.quantity + change) } : item)),
    );
  }

  function removeFromCart(sku: string) {
    setCart((current) => current.filter((item) => item.sku !== sku));
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

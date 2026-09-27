// Formatos que as telas usam depois da conversão feita em services/api/.

export type Product = {
  sku: string;
  name: string;
  price: number;
  // Endereço da foto; null quando o produto não tem (a loja mostra o ícone da categoria).
  photo: string | null;
};

export type Client = {
  cpf: string;
  name: string;
  level: string;
  bonusPercent: number;
  points: number;
  redeemablePoints: number;
  redeemableValue: number;
};

export type CartItem = {
  sku: string;
  quantity: number;
};

// Item do carrinho já com o produto (nome e preço) para mostrar na tela.
export type CartLine = CartItem & { product: Product };

export type Sale = {
  id: string;
  cpf: string | null;
  clientName: string | null;
  items: CartItem[];
  payment: string;
  pointsToRedeem: number;
  date: string;
  total: number;
  points: number;
  itemCount: number;
  time: string;
  synced?: boolean;
};

// Venda que o atendente está montando no PDV.
export type CurrentSale = {
  cart: CartItem[];
  client: Client | null;
  paymentMethod: string;
  pointsToRedeem: number;
};

export type Register = {
  name: string;
  online: boolean;
  pending: number;
};

export type Period = { start: string; end: string };

export type LevelSummary = {
  name: string;
  bonus: number;
  clients: number;
  percent: number;
};

export type RankingRow = {
  position: number;
  id: number;
  name: string;
  cpf: string;
  level: string;
  earned: number;
  balance: number;
};

export type SalesGroup = { name: string; count: number; revenue: number; percent: number };

export type SalesSummary = {
  count: number;
  revenue: number;
  averageTicket: number;
  withCpf: number;
  withCpfPercent: number;
  byRegister: SalesGroup[];
  byPayment: SalesGroup[];
  topProducts: { sku: string; name: string; units: number; revenue: number }[];
};

export type LevelRedemption = {
  code: string;
  name: string;
  purchases: number;
  purchasesWithRedemption: number;
  redeemRate: number;
  pointsRedeemed: number;
  pointsEarned: number;
};

export type DashboardData = {
  start: string;
  end: string;
  shortcuts: (Period & { label: string })[];
  totalClients: number;
  levels: LevelSummary[];
  points: {
    earned: number;
    redeemed: number;
    expired: number;
    redeemRate: number;
    cost: number;
    costPercent: number;
    purchases: number;
    openBalance: number;
    openBalanceValue: number;
    expiring: { days: number; points: number; value: number };
  };
  sales: SalesSummary;
  redemptionByLevel: LevelRedemption[];
  ranking: RankingRow[];
  monthly: { month: string; earned: number; redeemed: number; expired: number }[];
};

export type Action = {
  type: string;
  title: string;
  description: string;
  message: string;
  clients: { name: string; cpf: string; detail: string }[];
};

// Clientes (lista e perfil). O CPF chega mascarado da API; o `id` é o que liga a lista ao perfil.
export type Page = { total: number; page: number; pages: number };

export type ClientListItem = {
  id: number;
  name: string;
  cpf: string;
  level: string;
  points: number;
  purchases: number;
  lastPurchase: string | null;
};

export type ClientList = Page & { clients: ClientListItem[] };

export type ClientProfile = {
  id: number;
  name: string;
  cpf: string;
  registeredAt: string;
  registeredStore: string | null;
  // Preenchidos pelo cliente no perfil (opcionais). `birthDate` é "AAAA-MM-DD"; `contactConsentAt` é
  // quando ele autorizou receber ofertas (null = não autorizou).
  shoeSize: number | null;
  birthDate: string | null;
  contactConsentAt: string | null;
  level: string;
  bonusPercent: number;
  points12m: number;
  nextLevel: { name: string; missing: number } | null;
  points: number;
  redeemablePoints: number;
  redeemableValue: number;
  totalPurchases: number;
  totalSpent: number;
  totalEarned: number;
  totalRedeemed: number;
  lots: { points: number; expiresAt: string }[];
  purchases: {
    id: string;
    date: string;
    register: string | null;
    payment: string;
    paid: number;
    discount: number;
    pointsEarned: number;
    pointsRedeemed: number;
  }[];
  // `review`: nome do produto quando o acúmulo veio de uma avaliação (e não de uma compra).
  movements: { date: string; type: "ACUMULO" | "RESGATE" | "EXPIRACAO"; points: number; review: string | null }[];
};

// Vendas (lista e detalhe).
export type SaleListItem = {
  id: string;
  date: string;
  client: { id: number; name: string } | null;
  register: string | null;
  payment: string;
  itemCount: number;
  gross: number;
  discount: number;
  paid: number;
  pointsEarned: number;
  pointsRedeemed: number;
};

export type SaleFilters = {
  registers: { code: string; name: string }[];
  payments: { code: string; name: string }[];
};

export type SaleList = Page & {
  revenue: number;
  discount: number;
  filters: SaleFilters;
  sales: SaleListItem[];
};

export type SaleDetail = Omit<SaleListItem, "itemCount"> & {
  store: string;
  levelAtPurchase: string;
  items: { sku: string; name: string; quantity: number; unitPrice: number; subtotal: number }[];
};

// Área do cliente: o perfil + o que o próprio cliente quer ver no painel dele.
export type ClientDashboard = ClientProfile & {
  // Produtos comprados que faltam avaliar, os pontos que rendem e a compra mais recente entre eles.
  pendingReviews: { count: number; points: number; lastPurchase: string | null };
  levelProgress: number;
  expiring: { days: number; points: number; nextDate: string | null };
  savings: number;
  topProducts: (Product & { units: number })[];
};

// O que o cliente altera no perfil (os outros dados vêm do cadastro da loja).
export type ProfileUpdate = { shoeSize: number | null; birthDate: string | null; acceptsContact: boolean };

export type OnlinePayment = "PIX" | "CREDITO";

export type OnlinePurchase = {
  id: string;
  items: CartItem[];
  payment: OnlinePayment;
  pointsToRedeem: number;
};

export type OnlinePurchaseResult = {
  id: string;
  total: number;
  discount: number;
  pointsEarned: number;
  balance: number | null;
};

// Avaliações do cliente (Minha conta › Avaliações). As regras vêm da API (regras.py), não copiadas aqui.
export type PendingReview = { sku: string; name: string; price: number; photo: string | null; lastPurchase: string };
export type Review = { sku: string; name: string; photo: string | null; rating: number; comment: string; date: string; points: number };
export type Reviews = {
  pointsPerReview: number;
  minComment: number;
  pending: PendingReview[];
  done: Review[];
};

// Avaliações vistas pelo gerente (/admin/avaliacoes). Resumo e notas por produto são do catálogo todo;
// os filtros (produto, nota) valem só para a lista.
export type StoreReview = {
  id: number;
  date: string;
  client: { id: number; name: string };
  product: { sku: string; name: string };
  rating: number;
  comment: string;
};
export type StoreReviews = {
  total: number;
  page: number;
  pages: number;
  summary: { total: number; average: number | null; points: number };
  byRating: { rating: number; count: number }[];
  byProduct: { sku: string; name: string; count: number; average: number }[];
  reviews: StoreReview[];
};

// Estoque (tela Estoque do gerente). A situação vem pronta do backend (regras.situacao_do_estoque).
export type StockStatus = "ESGOTADO" | "ACABANDO" | "OK";
export type StockItem = { sku: string; name: string; quantity: number; minimum: number; status: StockStatus; sold: number };
export type Stock = {
  summary: { products: number; units: number; outOfStock: number; runningLow: number };
  soldDays: number;
  items: StockItem[];
};

// Usuário da equipe logado na área /admin.
export type StaffUser = { username: string; name: string };

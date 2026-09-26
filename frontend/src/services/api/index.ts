// Ponto de entrada da API: as telas importam de "services/api" e não precisam saber em qual módulo
// cada chamada mora. Os mapeadores (toClientProfile, toSaleDetail…) ficam de fora de propósito.
export { errorMessage } from "./http";
export { fetchProducts } from "./produtos";
export { fetchClient, registerClient, fetchClients, fetchClientProfile, type ClientQuery } from "./clientes";
export { sendSale, fetchSales, fetchSaleDetail, type SaleQuery } from "./vendas";
export { fetchActions } from "./acoes";
export { fetchStoreReviews, type StoreReviewQuery } from "./avaliacoes";
export { fetchDashboard } from "./dashboard";
export {
  fetchAccount, signIn, createAccess, signOut, updateProfile, buyOnline, fetchAccountPurchase, fetchReviews, sendReview,
} from "./conta";

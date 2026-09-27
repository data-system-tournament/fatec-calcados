import { createBrowserRouter, Navigate } from "react-router-dom";
import ClienteLayout from "../layouts/ClienteLayout";
import MainLayout from "../layouts/MainLayout";
import Actions from "../pages/acoes/Actions";
import AvaliacoesLoja from "../pages/avaliacoes/AvaliacoesLoja";
import Estoque from "../pages/estoque/Estoque";
import ClientePerfil from "../pages/clientes/ClientePerfil";
import Clientes from "../pages/clientes/Clientes";
import Avaliacoes from "../pages/conta/Avaliacoes";
import Checkout from "../pages/conta/Checkout";
import Loja from "../pages/conta/Loja";
import Produto from "../pages/conta/Produto";
import MinhaConta from "../pages/conta/MinhaConta";
import MinhasCompras from "../pages/conta/MinhasCompras";
import Dashboard from "../pages/dashboard/Dashboard";
import Cadastro from "../pages/inicio/Cadastro";
import Landing from "../pages/inicio/Landing";
import Login from "../pages/inicio/Login";
import EntrarEquipe from "../pages/inicio/EntrarEquipe";
import Privacidade from "../pages/inicio/Privacidade";
import Vendas from "../pages/vendas/Vendas";
import NotFound from "../pages/NotFound";
import Pdv from "../pages/pdv/Pdv";
import RouteError from "../pages/RouteError";

// Evite rotas começando com /api: esse caminho é repassado ao Django pelo proxy do Vite.
// O errorElement fica numa rota sem caminho para o erro de uma tela aparecer dentro do layout
// (com as abas), e não no lugar dele.
export const router = createBrowserRouter([
  // A landing fica fora do MainLayout: não tem topbar nem abas do sistema.
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/cadastro", element: <Cadastro /> },
  { path: "/privacidade", element: <Privacidade /> },
  // Login da equipe da loja: fora do MainLayout, que só abre com a sessão da equipe (EquipeProvider).
  { path: "/admin/entrar", element: <EntrarEquipe /> },
  // Área do cliente (login por CPF + senha em /login e /cadastro): a loja (/loja, tela inicial depois do
  // login) e a "Minha conta". Mesmo visual do MainLayout, com as rotas do cliente na sidebar.
  {
    element: <ClienteLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "loja", element: <Loja /> },
      { path: "loja/carrinho", element: <Checkout /> },
      { path: "loja/produto/:sku", element: <Produto /> },
      { path: "minha-conta", element: <MinhaConta /> },
      { path: "minha-conta/compras", element: <MinhasCompras /> },
      { path: "minha-conta/avaliacoes", element: <Avaliacoes /> },
      // Pontos e dados agora são seções da Minha conta; os endereços antigos levam até elas.
      { path: "minha-conta/pontos", element: <Navigate to="/minha-conta#pontos" replace /> },
      { path: "minha-conta/dados", element: <Navigate to="/minha-conta#dados" replace /> },
    ],
  },
  // Área da loja (PDV e gestão): fica em /admin e só se chega digitando o endereço; a landing só leva
  // o cliente para /login e /cadastro. Não confundir com o admin do Django (porta 8000).
  {
    path: "admin",
    element: <MainLayout />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "pdv", element: <Pdv /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "clientes", element: <Clientes /> },
          { path: "clientes/:id", element: <ClientePerfil /> },
          { path: "vendas", element: <Vendas /> },
          { path: "acoes", element: <Actions /> },
          { path: "avaliacoes", element: <AvaliacoesLoja /> },
          { path: "estoque", element: <Estoque /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
  // Qualquer outro endereço volta para a landing, sem abrir o layout da loja.
  { path: "*", element: <Navigate to="/" replace /> },
]);

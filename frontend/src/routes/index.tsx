import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Actions from "../pages/acoes/Actions";
import ClientePerfil from "../pages/clientes/ClientePerfil";
import Clientes from "../pages/clientes/Clientes";
import Dashboard from "../pages/dashboard/Dashboard";
import Cadastro from "../pages/inicio/Cadastro";
import Landing from "../pages/inicio/Landing";
import Login from "../pages/inicio/Login";
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
  {
    element: <MainLayout />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { path: "pdv", element: <Pdv /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "clientes", element: <Clientes /> },
          { path: "clientes/:id", element: <ClientePerfil /> },
          { path: "vendas", element: <Vendas /> },
          { path: "acoes", element: <Actions /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);

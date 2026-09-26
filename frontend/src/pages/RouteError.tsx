import { isRouteErrorResponse, Link, useLocation, useRouteError } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

// Erro inesperado ao desenhar uma tela: evita a página em branco e deixa recarregar.
function RouteError() {
  const error = useRouteError();
  // Também aparece na área do cliente: cada área volta para a própria tela inicial.
  const naLoja = useLocation().pathname.startsWith("/admin");
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error ? error.message : "Erro desconhecido.";

  return (
    <Card className="p-[18px]" role="alert">
      <h1 className="text-xl font-semibold tracking-[-.015em]">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-[13px] text-muted">{detail}</p>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="dark" onClick={() => window.location.reload()}>Recarregar a página</Button>
        <Link to={naLoja ? "/admin/dashboard" : "/loja"} className="text-[13px] font-medium text-ink underline underline-offset-[3px]">
          {naLoja ? "Ir para o Dashboard" : "Voltar para a loja"}
        </Link>
      </div>
    </Card>
  );
}

export default RouteError;

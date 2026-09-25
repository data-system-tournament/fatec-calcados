import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

// Erro inesperado ao desenhar uma tela: evita a página em branco e deixa recarregar.
function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error ? error.message : "Erro desconhecido.";

  return (
    <Card className="p-[18px]" role="alert">
      <h1 className="text-xl font-semibold tracking-[-.015em]">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-[13px] text-muted">{detail}</p>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="dark" onClick={() => window.location.reload()}>Recarregar a página</Button>
        <Link to="/dashboard" className="text-[13px] font-medium text-ink underline underline-offset-[3px]">Ir para o Dashboard</Link>
      </div>
    </Card>
  );
}

export default RouteError;

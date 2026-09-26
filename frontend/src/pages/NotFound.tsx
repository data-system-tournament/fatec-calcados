import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";

function NotFound() {
  return (
    <Card className="p-[18px]">
      <h1 className="text-xl font-semibold tracking-[-.015em]">Página não encontrada</h1>
      <p className="mt-2 text-[13px] text-muted">
        Esse endereço não existe. Volte para o{" "}
        <Link to="/admin/dashboard" className="font-medium text-ink underline underline-offset-[3px]">Dashboard</Link>.
      </p>
    </Card>
  );
}

export default NotFound;

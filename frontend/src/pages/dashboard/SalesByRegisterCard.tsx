import { Store } from "lucide-react";
import { Card } from "../../components/ui/Card";
import type { SalesGroup } from "../../types";
import BarrasDeVendas from "./BarrasDeVendas";
import CardHeading from "./CardHeading";

// Faturamento de cada caixa no período. Some quando não há vendas, porque o SalesCard já avisa.
function SalesByRegisterCard({ groups }: { groups: SalesGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <Card className="p-[18px]">
      <CardHeading icon={Store} tom="ciano" title="Vendas por caixa" subtitle="Faturamento e participação de cada caixa no período" />
      <BarrasDeVendas groups={groups} colunas="grid-cols-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1" />
    </Card>
  );
}

export default SalesByRegisterCard;

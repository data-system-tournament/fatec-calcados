import { Download, Printer, TrendingUp } from "lucide-react";
import PointsChart from "../../components/charts/PointsChart";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { hintClass } from "../../components/ui/styles";
import { STORE_NAME } from "../../config";
import { useDashboard } from "../../hooks/useDashboard";
import { usePeriodoNaUrl } from "../../hooks/usePeriodoNaUrl";
import { useTemaClaroAoImprimir } from "../../hooks/useTemaClaroAoImprimir";
import { formatDate } from "../../utils/format";
import CardHeading from "./CardHeading";
import { exportDashboardCsv } from "./exportCsv";
import { exportDashboardPdf } from "./exportPdf";
import KpiCards from "./KpiCards";
import LevelsCard from "./LevelsCard";
import PeriodFilter from "./PeriodFilter";
import PointsLiabilityCard from "./PointsLiabilityCard";
import Ranking from "./Ranking";
import RedemptionByLevelCard from "./RedemptionByLevelCard";
import SalesByRegisterCard from "./SalesByRegisterCard";
import SalesCard from "./SalesCard";
import Secao from "./Secao";
import TopProductsCard from "./TopProductsCard";

// Duas colunas (2/3 + 1/3); abaixo de 1100px, uma só.
const rowClass = "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 *:min-w-0 max-[1100px]:grid-cols-[minmax(0,1fr)]";
const halvesClass = "grid grid-cols-2 gap-4 *:min-w-0 max-[1100px]:grid-cols-[minmax(0,1fr)]";

// Feito com IA: a página é organizada por assunto (Pontos, Vendas, Clientes) e o filtro de período fica
// no corpo da página, como os filtros de Clientes e Vendas, e não mais no cabeçalho do site.
function Dashboard() {
  const [period, setPeriod] = usePeriodoNaUrl();
  const { data, error, loading, retry } = useDashboard(period);
  useTemaClaroAoImprimir();

  if (!data) {
    if (error) {
      return <ErrorState title="Não foi possível carregar o dashboard" message={error} onRetry={retry} />;
    }
    return <p className={hintClass} role="status">Carregando o dashboard...</p>;
  }

  return (
    <div
      className={`flex flex-col gap-8 transition-opacity duration-150 ${loading ? "opacity-50" : ""}`}
      aria-busy={loading}
    >
      <div className="flex flex-col gap-4">
        <Card className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 print:hidden">
          <PeriodFilter key={data.start + data.end} data={data} onChange={setPeriod} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => exportDashboardCsv(data)}>
              <Download size={14} className="flex-none" /> Exportar CSV
            </Button>
            <Button size="sm" onClick={() => exportDashboardPdf(data)}>
              <Printer size={14} className="flex-none" /> Exportar PDF
            </Button>
          </div>
        </Card>

        {/* Só no papel: o filtro some na impressão, então o período vai escrito no topo do PDF. */}
        <div className="hidden border-b border-line pb-3 print:block">
          <p className="text-[13px] text-muted">{STORE_NAME} · Programa de fidelidade</p>
          <p className="text-lg font-semibold">
            Dashboard de {formatDate(data.start)} a {formatDate(data.end)}
          </p>
        </div>

        {loading && <p className="sr-only" role="status">Atualizando o dashboard...</p>}
        {error && (
          <ErrorState title="Não foi possível atualizar os números" message={`${error} Os valores abaixo podem estar desatualizados.`} onRetry={retry} />
        )}

        <KpiCards data={data} />
      </div>

      <Secao title="Pontos" description="Quanto o programa acumulou, resgatou e ainda deve aos clientes." atraso={200}>
        <div className={rowClass}>
          <Card className="p-[18px]">
            <CardHeading icon={TrendingUp} tom="azul" title="Evolução no tempo" subtitle="Pontos acumulados, resgatados e expirados por mês" />
            <PointsChart data={data.monthly} />
          </Card>
          <PointsLiabilityCard points={data.points} />
        </div>
      </Secao>

      <Secao title="Vendas" description="Todas as vendas do período, com e sem CPF." atraso={280}>
        <div className={rowClass}>
          <SalesCard sales={data.sales} />
          <TopProductsCard products={data.sales.topProducts} />
        </div>
        <SalesByRegisterCard groups={data.sales.byRegister} />
      </Secao>

      <Secao title="Clientes" description="Quem está no programa, em que nível e quem mais pontua." atraso={360}>
        <div className={halvesClass}>
          <LevelsCard totalClients={data.totalClients} levels={data.levels} />
          <RedemptionByLevelCard levels={data.redemptionByLevel} />
        </div>
        <Ranking ranking={data.ranking} end={data.end} />
      </Secao>
    </div>
  );
}

export default Dashboard;

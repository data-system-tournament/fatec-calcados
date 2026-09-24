import PointsChart from "../components/PointsChart";
import { formatDate, formatMoney, formatNumber } from "../utils/format";

function Dashboard({ data, error }) {
  if (!data) {
    return <p className="hint">{error || "Carregando o dashboard..."}</p>;
  }

  return (
    <div className="dash">
      {error && <p className="err">{error}</p>}

      <KpiCards data={data} />

      <section className="row2">
        <div className="card">
          <h2>Evolução no tempo · pontos por mês</h2>
          <PointsChart data={data.monthly} />
        </div>
        <LevelsCard totalClients={data.totalClients} levels={data.levels} />
      </section>

      <Ranking ranking={data.ranking} end={data.end} />
    </div>
  );
}

function KpiCards({ data }) {
  const { points, totalClients } = data;

  return (
    <section className="kpis">
      <div className="card kpi">
        <span className="lbl">Base do programa</span>
        <strong>{formatNumber(totalClients)}</strong>
        <small>clientes cadastrados até {formatDate(data.end)}</small>
      </div>
      <div className="card kpi">
        <span className="lbl">Pontos acumulados</span>
        <strong>{formatNumber(points.earned)}</strong>
        <small>em {formatNumber(points.purchases)} compras com CPF · {formatNumber(points.expired)} expiraram</small>
      </div>
      <div className="card kpi">
        <span className="lbl">Pontos resgatados</span>
        <strong>{formatNumber(points.redeemed)}</strong>
        <small>{points.redeemRate.toLocaleString("pt-BR")}% do que foi acumulado</small>
      </div>
      <div className="card kpi">
        <span className="lbl">Custo do programa</span>
        <strong>{formatMoney(points.cost)}</strong>
        <small>
          {points.costPercent.toLocaleString("pt-BR")}% do faturamento · saldo em aberto vale até {formatMoney(points.openBalanceValue)}
        </small>
      </div>
    </section>
  );
}

function LevelsCard({ totalClients, levels }) {
  return (
    <div className="card">
      <h2>Base do programa · distribuição por nível</h2>
      <ul className="levels">
        {levels.map((level) => (
          <li key={level.name}>
            <span className={`badge ${level.name.toLowerCase()}`}>{level.name}</span>
            <span className="lv-rule">
              {level.bonus > 0 ? `+${level.bonus}% em pontos` : "1 ponto por real"} · {level.percent.toLocaleString("pt-BR")}%
            </span>
            <b>{level.clients}</b>
          </li>
        ))}
      </ul>
      <p className="hint">{totalClients} clientes no total. O nível vem dos pontos acumulados nos últimos 12 meses.</p>
    </div>
  );
}

function Ranking({ ranking, end }) {
  return (
    <div className="card">
      <h2>Ranking · clientes que mais acumularam pontos no período</h2>
      {ranking.length === 0 ? (
        <p className="hint">Nenhuma compra com CPF nesse período.</p>
      ) : (
        <div className="rank-wrap">
          <table className="rank">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>CPF</th>
                <th>Nível</th>
                <th className="num">Acumulado</th>
                <th className="num">Saldo em {formatDate(end)}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.position}>
                  <td>{row.position}</td>
                  <td>{row.name}</td>
                  <td>{row.cpf}</td>
                  <td><span className={`badge ${row.level.toLowerCase()}`}>{row.level}</span></td>
                  <td className="num">{formatNumber(row.earned)}</td>
                  <td className="num">{formatNumber(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

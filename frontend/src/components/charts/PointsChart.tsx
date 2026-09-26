import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "../../types";
import { formatNumber } from "../../utils/format";

const axisText = { fill: "var(--muted)", fontSize: 11 };
const tooltipBox = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 };

function PointsChart({ data }: { data: DashboardData["monthly"] }) {
  return (
    <>
      {/* Feito com IA: o SVG do gráfico não diz nada a um leitor de tela; ele lê a tabela abaixo,
          com os mesmos números, e o gráfico fica só para quem enxerga. */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="month" tick={axisText} tickLine={false} axisLine={false} />
            <YAxis tick={axisText} tickLine={false} axisLine={false} width={52} tickFormatter={formatNumber} />
            <Tooltip
              formatter={(value) => `${formatNumber(Number(value))} pts`}
              contentStyle={tooltipBox}
              labelStyle={{ color: "var(--ink)" }}
              cursor={{ fill: "var(--subtle)" }}
            />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12.5 }} />
            {/* As mesmas cores dos KPIs e do passivo de pontos: azul acumulado, verde resgatado, vermelho expirado. */}
            <Bar dataKey="earned" name="Acumulados" fill="var(--app)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="redeemed" name="Resgatados" fill="var(--ok)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expired" name="Expirados" fill="var(--danger)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Pontos por mês</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Acumulados</th>
            <th scope="col">Resgatados</th>
            <th scope="col">Expirados</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <th scope="row">{m.month}</th>
              <td>{formatNumber(m.earned)} pts</td>
              <td>{formatNumber(m.redeemed)} pts</td>
              <td>{formatNumber(m.expired)} pts</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default PointsChart;

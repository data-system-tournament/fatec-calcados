import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "../../types";
import { formatNumber } from "../../utils/format";

const axisText = { fill: "var(--muted)", fontSize: 11 };
const tooltipBox = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 };

// As mesmas cores dos KPIs e do passivo de pontos: azul acumulado, verde resgatado, vermelho expirado.
const SERIES = [
  { chave: "earned", nome: "Acumulados", cor: "var(--app)" },
  { chave: "redeemed", nome: "Resgatados", cor: "var(--ok)" },
  { chave: "expired", nome: "Expirados", cor: "var(--danger)" },
] as const;

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
            {SERIES.map((s) => (
              <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Feito com IA: legenda em HTML em vez da <Legend> do Recharts. A dele fica em posição absoluta
            sobre o gráfico e usa o mesmo <svg class="recharts-surface"> do gráfico, então quebrava no PDF
            quando o gráfico é redimensionado para a folha. Assim ela só segue o fluxo, na tela e no papel. */}
        <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
          {SERIES.map((s) => (
            <li key={s.chave} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px]" style={{ background: s.cor }} />
              {s.nome}
            </li>
          ))}
        </ul>
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

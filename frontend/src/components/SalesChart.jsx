import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "../utils/format";

const axisText = { fill: "var(--faint)", fontSize: 11 };
const tooltipBox = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8 };

// data: [{ hour: "8h", store: 0, app: 0 }, ...]
function SalesChart({ data }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="hour" tick={axisText} tickLine={false} axisLine={false} />
          <YAxis tick={axisText} tickLine={false} axisLine={false} width={48} />
          <Tooltip formatter={formatMoney} contentStyle={tooltipBox} labelStyle={{ color: "var(--ink)" }} />
          <Area dataKey="store" name="Loja física" stroke="var(--ink)" fill="var(--ink)" fillOpacity={0.08} strokeWidth={2} />
          <Area dataKey="app" name="App" stroke="var(--app)" fill="none" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="legend">
        <span><i className="sw fis" />Loja física</span>
        <span><i className="sw app" />App</span>
      </div>
    </>
  );
}

export default SalesChart;

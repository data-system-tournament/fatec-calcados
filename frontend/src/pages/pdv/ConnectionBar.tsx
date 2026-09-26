import { Wifi, WifiOff } from "lucide-react";
import { Led } from "../../components/ui/Led";
import { REGISTER_NAME } from "../../config";
import { plural } from "../../utils/format";

type ConnectionBarProps = {
  openedAt: string;
  online: boolean;
  pendingSales: number;
  onToggle: () => void;
};

// Status do caixa (nome, abertura, conexão) e o botão de simular queda; offline, mostra o aviso da fila.
function ConnectionBar({ openedAt, online, pendingSales, onToggle }: ConnectionBarProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-2.5">
          <Led on={online} />
          <b className="font-semibold">{REGISTER_NAME}</b>
          <span className="text-muted">{online ? "online" : "offline"}</span>
        </span>
        <span className="text-muted">Aberto às {openedAt}</span>
        <button
          onClick={onToggle}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          {online ? <WifiOff size={14} className="flex-none" aria-hidden="true" /> : <Wifi size={14} className="flex-none" aria-hidden="true" />}
          {online ? "Simular queda de internet" : "Reconectar"}
        </button>
      </div>

      {!online && (
        <div className="flex items-center gap-2.5 rounded-[10px] bg-accent-soft px-3.5 py-2.5 text-[13px] font-medium text-accent-ink" role="status">
          <WifiOff size={16} className="flex-none" aria-hidden="true" />
          Sem internet. Vendas salvas neste caixa ({pendingSales} {plural(pendingSales, "pendente", "pendentes")}).
          Sincroniza sozinho quando a conexão voltar.
        </div>
      )}
    </>
  );
}

export default ConnectionBar;

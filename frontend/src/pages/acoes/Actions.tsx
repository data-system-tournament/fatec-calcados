import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { useAcoes } from "../../contexts/acoes";
import { useCaixa } from "../../contexts/caixa";
import { useToast } from "../../contexts/toast";
import type { Action } from "../../types";
import ActionCard from "./ActionCard";
import ActionModal from "./ActionModal";
import PulseCard from "./PulseCard";

function Actions() {
  const { actions, status, error, doneTypes, loadActions, retry, markDone } = useAcoes();
  const { newClientsToday, pointsRedeemedToday, registers } = useCaixa();
  const notify = useToast();
  const [openType, setOpenType] = useState<string | null>(null);
  const openAction = actions.find((a) => a.type === openType);

  // As listas mudam com as vendas do dia: recarrega sempre que a página abre.
  useEffect(loadActions, [loadActions]);

  function handleDone(action: Action) {
    markDone(action.type);
    setOpenType(null);
    notify(`“${action.title}” marcada como feita`);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-6 max-[860px]:grid-cols-1">
      <div className="flex flex-col gap-2.5">
        {status === "loading" && actions.length === 0 && (
          <Card className="px-[18px] py-4 text-[13px] text-muted" role="status">Carregando ações...</Card>
        )}
        {status === "error" && (
          <ErrorState
            title="Não foi possível carregar as ações"
            message={actions.length > 0 ? `${error} As listas abaixo podem estar desatualizadas.` : error}
            onRetry={retry}
          />
        )}

        {actions.map((action) => (
          <ActionCard
            key={action.type}
            action={action}
            done={doneTypes.includes(action.type)}
            onOpen={() => setOpenType(action.type)}
          />
        ))}
      </div>

      <PulseCard newClientsToday={newClientsToday} pointsRedeemedToday={pointsRedeemedToday} registers={registers} />

      {openAction && (
        <ActionModal action={openAction} onDone={() => handleDone(openAction)} onClose={() => setOpenType(null)} />
      )}
    </div>
  );
}

export default Actions;

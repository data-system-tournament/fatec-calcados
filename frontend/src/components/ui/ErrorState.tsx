import { Button } from "./Button";
import { Card } from "./Card";

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry: () => void;
};

// Falha ao carregar uma tela: diz o que houve e deixa tentar de novo sem recarregar a página.
export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <Card className="flex items-center justify-between gap-4 px-[18px] py-4 max-[860px]:flex-col max-[860px]:items-stretch" role="alert">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-[3px] text-[13px] text-muted">{message}</p>
      </div>
      <Button variant="dark" onClick={onRetry}>Tentar de novo</Button>
    </Card>
  );
}

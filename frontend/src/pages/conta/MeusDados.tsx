import { Card, CardTitle } from "../../components/ui/Card";
import { hintClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { formatDay } from "../../utils/format";

// "Minha conta › Meus dados": dados pessoais só para leitura (o cadastro vem do caixa). Por enquanto o
// cliente não altera nada por aqui; o backend já tem POST /api/conta/senha/ para quando a troca de senha voltar.
function MeusDados() {
  const { account } = useConta();
  if (!account) return null;

  return (
    <Card className="max-w-xl p-[18px]">
      <CardTitle>Dados pessoais</CardTitle>
      <dl className="flex flex-col text-[13.5px]">
        <Linha rotulo="Nome" valor={account.name} />
        <Linha rotulo="CPF" valor={account.cpf} />
        <Linha rotulo="Cliente desde" valor={formatDay(account.registeredAt)} />
        <Linha rotulo="Cadastrado na" valor={account.registeredStore ?? "—"} />
        <Linha rotulo="Nível" valor={account.level} />
      </dl>
      <p className={hintClass}>Para corrigir algum dado, fale com a equipe em qualquer loja FATECalçados.</p>
    </Card>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 first:pt-0 last:border-0">
      <dt className="text-muted">{rotulo}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}

export default MeusDados;

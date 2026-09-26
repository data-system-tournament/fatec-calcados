import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { errorClass, fieldLabelClass, hintClass, inputClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { useToast } from "../../contexts/toast";
import { changePassword, errorMessage } from "../../services/api";
import { formatDay } from "../../utils/format";

// "Minha conta › Meus dados": dados pessoais (só leitura: o cadastro vem do caixa) e a troca de senha,
// como as seções "Meus dados" e "Segurança" das lojas online.
function MeusDados() {
  const { account } = useConta();
  if (!account) return null;

  return (
    <div className="grid grid-cols-2 items-start gap-4 *:min-w-0 max-[1000px]:grid-cols-[minmax(0,1fr)]">
      <Card className="p-[18px]">
        <CardTitle>Dados pessoais</CardTitle>
        <dl className="flex flex-col text-[13.5px]">
          <Linha rotulo="Nome" valor={account.name} />
          <Linha rotulo="CPF" valor={account.cpf} />
          <Linha rotulo="Cliente desde" valor={formatDay(account.registeredAt)} />
          <Linha rotulo="Cadastrado na" valor={account.registeredStore ?? "—"} />
          <Linha rotulo="Nível" valor={account.level} />
        </dl>
        <p className={hintClass}>Para corrigir o nome, fale com a equipe em qualquer loja FATECalçados.</p>
      </Card>

      <AlterarSenha />
    </div>
  );
}

function AlterarSenha() {
  const notify = useToast();
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = new FormData(form);
    const nova = String(dados.get("nova") ?? "");
    if (nova !== dados.get("confirmacao")) {
      setErro("A nova senha e a confirmação não são iguais.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      await changePassword(String(dados.get("atual") ?? ""), nova);
      form.reset();
      notify("Senha alterada");
    } catch (error) {
      setErro(errorMessage(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="p-[18px]">
      <CardTitle>Segurança · alterar senha</CardTitle>
      <form onSubmit={enviar} noValidate>
        <label className={fieldLabelClass}>
          Senha atual
          <input type="password" name="atual" autoComplete="current-password" className={inputClass} />
        </label>
        <label className={fieldLabelClass}>
          Nova senha
          <input type="password" name="nova" autoComplete="new-password" placeholder="Pelo menos 8 caracteres" className={inputClass} />
        </label>
        <label className={fieldLabelClass}>
          Confirme a nova senha
          <input type="password" name="confirmacao" autoComplete="new-password" className={inputClass} />
        </label>
        {erro && <p className={errorClass} role="alert">{erro}</p>}
        <Button type="submit" variant="dark" className="mt-3" disabled={enviando}>
          {enviando ? "Salvando..." : "Alterar senha"}
        </Button>
      </form>
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

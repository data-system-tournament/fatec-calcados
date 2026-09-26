import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { errorClass, fieldLabelClass, hintClass, inputClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { useToast } from "../../contexts/toast";
import { errorMessage, updateProfile } from "../../services/api";
import type { ClientDashboard } from "../../types";
import { formatDay } from "../../utils/format";

// Os mesmos limites de regras.py (NUMERACAO_MINIMA/MAXIMA); quem valida de verdade é o backend.
const NUMERACOES = Array.from({ length: 48 - 16 + 1 }, (_, i) => 16 + i);

// Aba "Meus dados" do Meu perfil. O cliente completa o que só ele sabe (numeração, aniversário e se quer
// receber ofertas); nome e CPF vêm do cadastro da loja e continuam só para leitura.
function MeusDados({ account }: { account: ClientDashboard }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Preferencias account={account} />
      <Card className="p-[18px]">
        <CardTitle>Dados pessoais</CardTitle>
        <dl className="flex flex-col text-[13.5px]">
          <Linha rotulo="Nome" valor={account.name} />
          <Linha rotulo="CPF" valor={account.cpf} />
          <Linha rotulo="Cliente desde" valor={formatDay(account.registeredAt)} />
          <Linha rotulo="Cadastrado na" valor={account.registeredStore ?? "—"} />
          <Linha rotulo="Nível" valor={account.level} />
        </dl>
        <p className={hintClass}>Para corrigir nome ou CPF, fale com a equipe em qualquer loja FATECalçados.</p>
      </Card>
    </div>
  );
}

// Feito com IA: formulário da numeração, do aniversário e da autorização de contato (LGPD: a autorização é
// um checkbox desmarcado por padrão, com a data em que foi dada). Salvar recarrega a conta, e as
// notificações e o aviso de "complete seu perfil" se atualizam sozinhos.
function Preferencias({ account }: { account: ClientDashboard }) {
  const { reload } = useConta();
  const notify = useToast();
  const [numeracao, setNumeracao] = useState(account.shoeSize?.toString() ?? "");
  const [nascimento, setNascimento] = useState(account.birthDate ?? "");
  const [aceita, setAceita] = useState(account.contactConsentAt !== null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const mudou =
    numeracao !== (account.shoeSize?.toString() ?? "") ||
    nascimento !== (account.birthDate ?? "") ||
    aceita !== (account.contactConsentAt !== null);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await updateProfile({ shoeSize: numeracao ? Number(numeracao) : null, birthDate: nascimento || null, acceptsContact: aceita });
      await reload();
      notify("Perfil atualizado");
    } catch (error) {
      setErro(errorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="p-[18px]">
      <CardTitle>Tamanho e aniversário</CardTitle>
      <p className="-mt-1 mb-4 text-[13px] text-muted">
        Com a sua numeração avisamos quando chegar o seu tamanho; com o aniversário, lembramos do seu dia.
      </p>
      <form onSubmit={salvar} noValidate>
        <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
          <label className={fieldLabelClass}>
            Numeração do calçado
            <select className={inputClass} value={numeracao} onChange={(e) => setNumeracao(e.target.value)}>
              <option value="">Não informar</option>
              {NUMERACOES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className={fieldLabelClass}>
            Data de nascimento
            <input
              type="date"
              className={inputClass}
              value={nascimento}
              max={hojeIso()}
              autoComplete="bday"
              onChange={(e) => setNascimento(e.target.value)}
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px]">
          <input
            type="checkbox"
            checked={aceita}
            onChange={(e) => setAceita(e.target.checked)}
            className="mt-0.5 size-4 flex-none accent-[var(--ink)]"
          />
          <span>
            Quero receber ofertas e novidades da FATECalçados
            <small className="mt-0.5 block text-xs text-muted">
              {account.contactConsentAt
                ? `Autorizado em ${formatDay(account.contactConsentAt)}. Você pode desmarcar quando quiser.`
                : "Opcional. Você pode desmarcar quando quiser."}
            </small>
          </span>
        </label>

        {erro && <p className={`${errorClass} mt-3`} role="alert">{erro}</p>}
        <div className="mt-4 flex justify-end">
          <Button variant="dark" type="submit" disabled={!mudou || salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// "AAAA-MM-DD" de hoje no fuso do navegador (toISOString usaria UTC e poderia virar o dia).
function hojeIso(): string {
  const hoje = new Date();
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return `${hoje.getFullYear()}-${doisDigitos(hoje.getMonth() + 1)}-${doisDigitos(hoje.getDate())}`;
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

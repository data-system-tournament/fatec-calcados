import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { errorClass, fieldLabelClass, hintClass, inputClass } from "../../components/ui/styles";
import { useConta } from "../../contexts/conta";
import { useToast } from "../../contexts/toast";
import { deleteAccount, errorMessage, updateProfile } from "../../services/api";
import type { ClientDashboard } from "../../types";
import { formatDay, formatNumber } from "../../utils/format";

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
      <ExcluirConta account={account} />
    </div>
  );
}

type Rascunho = { numeracao: string; nascimento: string; aceita: boolean };

// Feito com IA: o que foi preenchido e ainda não salvo fica no sessionStorage (por cliente), porque sair da aba
// desmonta o formulário: sem isso, abrir "Como usamos seus dados" (/privacidade) e voltar apagava o que a
// pessoa tinha digitado. sessionStorage e não localStorage: o rascunho acaba junto com a aba. Pode falhar
// (aba anônima, bloqueio); aí o formulário segue só na memória, como antes.
const chaveDoRascunho = (clienteId: number) => `fatec:rascunho-perfil:${clienteId}`;

function lerRascunho(clienteId: number): Rascunho | null {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(chaveDoRascunho(clienteId)) ?? "null");
    if (salvo && typeof salvo.numeracao === "string" && typeof salvo.nascimento === "string" && typeof salvo.aceita === "boolean") {
      return salvo;
    }
  } catch {
    // rascunho ilegível ou sem sessionStorage: começa do que está salvo na conta
  }
  return null;
}

function gravarRascunho(clienteId: number, rascunho: Rascunho | null) {
  try {
    if (rascunho) sessionStorage.setItem(chaveDoRascunho(clienteId), JSON.stringify(rascunho));
    else sessionStorage.removeItem(chaveDoRascunho(clienteId));
  } catch {
    // sem sessionStorage: o rascunho fica só na memória
  }
}

// Feito com IA: formulário da numeração, do aniversário e da autorização de contato (LGPD: a autorização é
// um checkbox desmarcado por padrão, com a data em que foi dada). Salvar recarrega a conta, e as
// notificações e o aviso de "complete seu perfil" se atualizam sozinhos.
function Preferencias({ account }: { account: ClientDashboard }) {
  const { reload } = useConta();
  const notify = useToast();
  const salvo: Rascunho = {
    numeracao: account.shoeSize?.toString() ?? "",
    nascimento: account.birthDate ?? "",
    aceita: account.contactConsentAt !== null,
  };
  const [rascunho] = useState(() => lerRascunho(account.id));
  const [numeracao, setNumeracao] = useState(rascunho?.numeracao ?? salvo.numeracao);
  const [nascimento, setNascimento] = useState(rascunho?.nascimento ?? salvo.nascimento);
  const [aceita, setAceita] = useState(rascunho?.aceita ?? salvo.aceita);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const mudou = numeracao !== salvo.numeracao || nascimento !== salvo.nascimento || aceita !== salvo.aceita;

  // Guarda enquanto houver diferença do que está salvo; depois de salvar (ou desfazer à mão), apaga.
  useEffect(() => {
    gravarRascunho(account.id, mudou ? { numeracao, nascimento, aceita } : null);
  }, [account.id, mudou, numeracao, nascimento, aceita]);

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
                : "Opcional. Você pode desmarcar quando quiser."}{" "}
              <Link to="/privacidade" className="underline underline-offset-[3px] hover:text-ink">Como usamos seus dados</Link>
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

// Feito com IA: exclusão da conta (LGPD). Fica no fim de Meus dados, discreta, e abre um modal que diz o que
// acontece (inclusive a perda dos pontos, com o saldo atual) e pede a senha. Depois de excluir, a sessão já
// acabou no backend: limpa o estado da conta e volta para a página inicial.
function ExcluirConta({ account }: { account: ClientDashboard }) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card className="p-[18px]">
      <CardTitle>Excluir minha conta</CardTitle>
      <p className="-mt-1 mb-3 text-[13px] text-muted">
        Apaga seus dados pessoais e sua senha. Os pontos que você ainda tem são cancelados.
      </p>
      <Button onClick={() => setAberto(true)} className="text-danger">Excluir minha conta</Button>
      {aberto && <ConfirmarExclusao points={account.points} onClose={() => setAberto(false)} />}
    </Card>
  );
}

function ConfirmarExclusao({ points, onClose }: { points: number; onClose: () => void }) {
  const { signOut } = useConta();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  async function excluir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExcluindo(true);
    setErro("");
    try {
      await deleteAccount(senha);
    } catch (error) {
      setErro(errorMessage(error));
      setExcluindo(false);
      return;
    }
    await signOut();
    navigate("/", { replace: true });
  }

  const footer = (
    <>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="dark" type="submit" form="excluir-conta" disabled={!senha || excluindo}>
        {excluindo ? "Excluindo..." : "Excluir de vez"}
      </Button>
    </>
  );

  return (
    <Modal title="Excluir minha conta" onClose={onClose} footer={footer}>
      <form id="excluir-conta" onSubmit={excluir}>
        <ul className="mb-3.5 flex list-disc flex-col gap-1.5 pl-5 text-[13.5px] text-ink-2">
          <li>Apagamos seu nome, CPF, numeração, data de nascimento, autorização de ofertas e senha.</li>
          <li>
            {points > 0
              ? <>Seus <b>{formatNumber(points)} pontos</b> são cancelados e não voltam.</>
              : "Você não tem pontos para perder."}
          </li>
          <li>As compras continuam no registro da loja, sem ligação com você.</li>
          <li>Não dá para desfazer. Se voltar a comprar, você entra no programa do zero.</li>
        </ul>
        <label className={fieldLabelClass}>
          Digite sua senha para confirmar
          <input className={inputClass} type="password" autoComplete="current-password" autoFocus
            value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <p className={errorClass} role="alert">{erro}</p>}
      </form>
    </Modal>
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

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage, signIn } from "../../services/api";
import { formatCpf } from "../../utils/cpf";
import { Campo, linkRodape, TelaAcesso } from "./TelaAcesso";

// Entrada do cliente na área dele: CPF + senha (sessão do Django). Sem e-mail.
export default function Login() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(dados: FormData) {
    setEnviando(true);
    setErro("");
    try {
      await signIn(cpf, String(dados.get("senha") ?? ""));
      navigate("/loja");
    } catch (e) {
      setErro(errorMessage(e));
      setEnviando(false);
    }
  }

  return (
    <TelaAcesso
      titulo="Bem-vindo de volta"
      subtitulo="Entre com seu CPF e senha para ver seus pontos e comprar."
      botao="Entrar"
      onSubmit={entrar}
      erro={erro}
      enviando={enviando}
      rodape={
        <>
          Primeiro acesso?{" "}
          <Link to="/cadastro" className={linkRodape}>
            Criar minha senha
          </Link>
        </>
      }
    >
      <Campo
        rotulo="CPF"
        name="cpf"
        inputMode="numeric"
        autoComplete="username"
        placeholder="000.000.000-00"
        value={cpf}
        onChange={(e) => setCpf(formatCpf(e.target.value))}
      />
      <Campo rotulo="Senha" type="password" name="senha" autoComplete="current-password" />
    </TelaAcesso>
  );
}

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errorMessage, staffSignIn } from "../../services/api";
import { FUNDO_SECRETO } from "./fotos";
import { Campo, linkRodape, TelaAcesso } from "./TelaAcesso";

// Entrada da equipe da loja na área /admin (PDV e gestão): usuário + senha criados com
// `manage.py criar_admin`. Depois de entrar, volta para a tela que a pessoa tinha pedido. Mesmo visual do
// /login do cliente (cartão sobre a foto escondida).
export default function EntrarEquipe() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const destino = typeof state?.de === "string" && state.de.startsWith("/admin") ? state.de : "/admin";

  async function entrar(dados: FormData) {
    setEnviando(true);
    setErro("");
    try {
      await staffSignIn(String(dados.get("usuario") ?? ""), String(dados.get("senha") ?? ""));
      navigate(destino, { replace: true });
    } catch (e) {
      setErro(errorMessage(e));
      setEnviando(false);
    }
  }

  return (
    <TelaAcesso
      titulo="Área da loja"
      subtitulo="Entre com seu usuário da equipe para abrir o caixa e a gestão."
      botao="Entrar"
      onSubmit={entrar}
      fundoSecreto={FUNDO_SECRETO}
      erro={erro}
      enviando={enviando}
      rodape={
        <>
          É cliente?{" "}
          <Link to="/login" className={linkRodape}>
            Entre na sua conta
          </Link>
        </>
      }
    >
      <Campo rotulo="Usuário" name="usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} />
      <Campo rotulo="Senha" type="password" name="senha" autoComplete="current-password" />
    </TelaAcesso>
  );
}

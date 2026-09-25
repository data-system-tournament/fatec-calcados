import { Link, useNavigate } from "react-router-dom";
import { Campo, linkRodape, TelaAcesso } from "./TelaAcesso";

// Ainda sem autenticação: não grava nada, o botão leva direto ao painel, mesmo com os campos vazios.
export default function Cadastro() {
  const navigate = useNavigate();

  return (
    <TelaAcesso
      titulo="Criar conta"
      subtitulo="Cadastre-se para usar o sistema da loja."
      botao="Criar conta"
      onSubmit={() => navigate("/dashboard")}
      rodape={
        <>
          Já tem conta?{" "}
          <Link to="/login" className={linkRodape}>
            Entrar
          </Link>
        </>
      }
    >
      <Campo rotulo="Nome" name="nome" autoComplete="name" />
      <Campo rotulo="E-mail" type="email" name="email" autoComplete="email" placeholder="voce@fatecalcados.com.br" />
      <Campo rotulo="Senha" type="password" name="senha" autoComplete="new-password" />
    </TelaAcesso>
  );
}

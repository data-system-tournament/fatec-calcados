import { Link, useNavigate } from "react-router-dom";
import { Campo, LembrarDeMim, linkRodape, TelaAcesso } from "./TelaAcesso";

// Ainda sem autenticação: o botão leva direto ao painel, mesmo com os campos vazios.
export default function Login() {
  const navigate = useNavigate();

  return (
    <TelaAcesso
      titulo="Bem-vindo de volta"
      subtitulo="Entre com as credenciais da sua loja."
      botao="Entrar"
      onSubmit={() => navigate("/dashboard")}
      rodape={
        <>
          Não tem conta?{" "}
          <Link to="/cadastro" className={linkRodape}>
            Criar conta
          </Link>
        </>
      }
    >
      <Campo rotulo="E-mail" type="email" name="email" autoComplete="email" placeholder="voce@fatecalcados.com.br" />
      <Campo rotulo="Senha" type="password" name="senha" autoComplete="current-password" />
      <LembrarDeMim />
    </TelaAcesso>
  );
}

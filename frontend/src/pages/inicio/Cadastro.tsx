import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createAccess, errorMessage } from "../../services/api";
import { formatCpf, isValidCpf } from "../../utils/cpf";
import { Campo, linkRodape, TelaAcesso } from "./TelaAcesso";

// Primeiro acesso do cliente. Quem já compra na loja (CPF cadastrado no caixa) informa o mesmo nome
// do cadastro e passa a ver os pontos e as compras de antes; CPF novo vira cadastro na loja online.
export default function Cadastro() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function criar(dados: FormData) {
    const senha = String(dados.get("senha") ?? "");
    if (!isValidCpf(cpf)) {
      setErro("CPF inválido. Confira os números.");
      return;
    }
    if (senha !== dados.get("confirmacao")) {
      setErro("As senhas não são iguais.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      await createAccess(cpf, String(dados.get("nome") ?? ""), senha);
      navigate("/loja");
    } catch (e) {
      setErro(errorMessage(e));
      setEnviando(false);
    }
  }

  return (
    <TelaAcesso
      titulo="Criar minha senha"
      subtitulo="Já compra com a gente? Use o mesmo CPF e nome do cadastro da loja para ver seus pontos."
      botao="Criar acesso"
      onSubmit={criar}
      erro={erro}
      enviando={enviando}
      rodape={
        <>
          Já tem senha?{" "}
          <Link to="/login" className={linkRodape}>
            Entrar
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
      <Campo rotulo="Nome" name="nome" autoComplete="name" />
      <Campo rotulo="Senha" type="password" name="senha" autoComplete="new-password" placeholder="Pelo menos 8 caracteres" />
      <Campo rotulo="Confirme a senha" type="password" name="confirmacao" autoComplete="new-password" />
    </TelaAcesso>
  );
}

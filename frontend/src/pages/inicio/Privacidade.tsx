import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PRIVACY_EMAIL } from "../../config";
import { BLOCK_VALUE, POINTS_PER_BLOCK, VALIDITY_MONTHS } from "../../regras";
import { formatMoney } from "../../utils/format";
import { BotaoTema } from "./BotaoTema";

// Feito com IA: Política de Privacidade (LGPD, Lei 13.709/2018). O texto descreve o que o sistema faz de
// verdade hoje: quais dados guarda, para quê, os cookies (só os necessários, por isso não há banner de
// consentimento) e como o cliente exclui a conta (services.excluir_conta). Ao mudar o que o sistema
// coleta ou como usa, atualize aqui. Mesma moldura clara/escura de /login (.landing-acesso).
export default function Privacidade() {
  const navigate = useNavigate();

  return (
    <div className="landing landing-acesso flex min-h-svh flex-col px-4 sm:px-8">
      <header className="flex h-20 items-center justify-between">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-2 text-[14px] text-(--l-texto-2) transition-colors hover:text-(--l-texto)"
        >
          <ArrowLeft size={16} aria-hidden /> Voltar
        </button>
        <BotaoTema />
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 pt-6 pb-16">
        <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-.03em]">Política de Privacidade</h1>
        <p className="mt-3 text-[15px] text-(--l-texto-2)">
          Como a FATECalçados cuida dos seus dados no programa de fidelidade, conforme a Lei Geral de Proteção de
          Dados (LGPD, Lei 13.709/2018). Atualizada em setembro de 2026.
        </p>

        <Secao titulo="Quais dados guardamos">
          <ul className={lista}>
            <li><b>CPF e nome</b>, informados no caixa ou no cadastro do site. O CPF identifica você no programa.</li>
            <li><b>Senha</b> do site, guardada de forma cifrada (nem a equipe da loja consegue lê-la).</li>
            <li><b>Suas compras</b>: data, loja, produtos, valores, forma de pagamento e pontos ganhos ou usados.</li>
            <li><b>Avaliações</b> que você escreve sobre os produtos.</li>
            <li>
              <b>Opcionais</b>, só se você preencher em Minha conta: numeração do calçado, data de nascimento e a
              autorização para receber ofertas (com a data em que foi dada).
            </li>
          </ul>
          <p className={paragrafo}>Não guardamos dados de cartão: o pagamento é feito fora do programa.</p>
        </Secao>

        <Secao titulo="Para que usamos e com que base legal">
          <ul className={lista}>
            <li>
              <b>Rodar o programa de pontos</b> (CPF, nome, compras, pontos e avaliações): é o serviço que você pediu
              ao entrar no programa (art. 7º, V, da LGPD). A cada {POINTS_PER_BLOCK} pontos você tem{" "}
              {formatMoney(BLOCK_VALUE)} de desconto, e os pontos valem por {VALIDITY_MONTHS} meses.
            </li>
            <li><b>Guardar os registros de venda</b>, como a lei fiscal exige (art. 7º, II).</li>
            <li>
              <b>Enviar ofertas, avisar do seu tamanho e lembrar do seu aniversário</b>: só com o seu consentimento
              (art. 7º, I), que você dá e retira em Minha conta, em Meus dados.
            </li>
          </ul>
          <p className={paragrafo}>
            Não vendemos nem repassamos seus dados. A equipe da loja vê o seu nome e as suas compras para atender
            você, mas nas listas e nos relatórios o CPF aparece mascarado (***.982.247-**).
          </p>
        </Secao>

        <Secao titulo="Cookies e dados no navegador">
          <p className={paragrafo}>
            Usamos só o que é <b>necessário para o site funcionar</b>, e por isso não pedimos consentimento de cookies:
          </p>
          <ul className={lista}>
            <li><b>sessionid</b>: mantém você logado.</li>
            <li><b>csrftoken</b>: protege os formulários contra envios feitos por outros sites.</li>
            <li>
              <b>Armazenamento do navegador</b>: tema claro ou escuro, tamanho da letra, carrinho e avisos já lidos.
              Fica só no seu aparelho.
            </li>
          </ul>
          <p className={paragrafo}>
            Não usamos cookies de análise nem de publicidade. As fotos dos produtos e da página inicial vêm do
            Unsplash (images.unsplash.com), que recebe o endereço IP de quem abre a página, como qualquer site que
            entrega imagens.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo guardamos">
          <p className={paragrafo}>
            Seus dados ficam enquanto você tiver conta no programa. Os pontos expiram {VALIDITY_MONTHS} meses
            depois da compra que os gerou. Os registros de venda são guardados pelo prazo da lei fiscal, mesmo depois
            que a conta é excluída, mas sem ligação com você.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <ul className={lista}>
            <li>
              <b>Ver e corrigir seus dados</b>: em Minha conta você vê seus pontos, extrato, compras e dados. Nome e CPF
              são corrigidos em qualquer loja FATECalçados.
            </li>
            <li><b>Retirar o consentimento de ofertas</b>: desmarque a opção em Meus dados, quando quiser.</li>
            <li>
              <b>Excluir sua conta</b>: em Minha conta, na aba Meus dados, use "Excluir minha conta". Apagamos seu nome,
              CPF, numeração, data de nascimento, autorização de ofertas e senha, e os pontos que você ainda tinha são
              cancelados. As vendas continuam no nosso registro, sem ligação com você, e as suas avaliações passam a
              aparecer como "Cliente excluído". Se voltar a comprar, você entra no programa de novo, do zero.
            </li>
            <li>
              <b>Outros pedidos</b> (cópia dos seus dados, dúvidas, reclamações): escreva para o nosso encarregado de
              dados. Você também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).
            </li>
          </ul>
        </Secao>

        <Secao titulo="Contato">
          <p className={paragrafo}>
            Encarregado de dados da FATECalçados:{" "}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="font-medium text-(--l-texto) underline underline-offset-4">
              {PRIVACY_EMAIL}
            </a>
          </p>
        </Secao>

        <p className="mt-12 text-[14px] text-(--l-texto-2)">
          <Link to="/" className="font-medium text-(--l-texto) underline underline-offset-4">Página inicial</Link>
          {" · "}
          <Link to="/login" className="font-medium text-(--l-texto) underline underline-offset-4">Entrar</Link>
        </p>
      </main>

      <footer className="flex h-16 items-center justify-end text-[13px] text-(--l-texto-2)">
        © 2026 FATECalçados · Desafio de Inovação Data System
      </footer>
    </div>
  );
}

const lista = "mt-3 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-(--l-texto-2) marker:text-(--l-texto-2)/60";
const paragrafo = "mt-3 text-[15px] leading-relaxed text-(--l-texto-2)";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-(--l-linha) pt-8">
      <h2 className="text-[1.2rem] font-semibold tracking-[-.02em] text-(--l-texto)">{titulo}</h2>
      {children}
    </section>
  );
}

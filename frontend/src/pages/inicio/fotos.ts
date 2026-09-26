// Feito com IA: fotos da landing, todas do Unsplash (licença Unsplash: uso livre, sem atribuição
// obrigatória), carregadas por URL. O CDN deles redimensiona pelo parâmetro `w`.
// Os tênis da vitrine foram escolhidos por terem fundo de estúdio 100% liso (a borda inteira da foto na
// mesma cor, medida pixel a pixel): `fundo` é essa cor, e a seção do hero pinta o fundo com ela, então a
// borda da foto não aparece e o tênis parece solto na página. Foto com vinheta ou degradê no fundo não
// serve aqui, porque a emenda fica visível. O `fm=jpg` fixa o formato em que as cores foram medidas.
// Os preços são só exemplo (a landing avisa); servem para mostrar quantos pontos um par rende.

export function foto(id: string, largura: number) {
  return `https://images.unsplash.com/photo-${id}?w=${largura}&q=85&fm=jpg&fit=max`;
}

export type Tenis = {
  id: string;
  alt: string;
  estilo: string;
  preco: number;
  fundo: string;
  // Cor do texto sobre o fundo: "clara" (branco) nos fundos escuros, "escura" (preto) nos claros.
  tinta: "clara" | "escura";
  // object-position da foto no quadro 5:4 do hero, para o tênis ficar centralizado no recorte.
  foco: string;
};

// O primeiro é fixo (abre a vitrine); os outros vêm em ordem sorteada.
export const TENIS: Tenis[] = [
  { id: "1608231387042-66d1773070a5", alt: "Tênis casual branco de couro", estilo: "Casual", preco: 299.9, fundo: "#131313", tinta: "clara", foco: "50% 50%" },
  { id: "1605348532760-6753d2c43329", alt: "Tênis de basquete preto de cano médio com sola branca", estilo: "Basquete", preco: 699.9, fundo: "#85bedf", tinta: "escura", foco: "50% 54%" },
  { id: "1606107557195-0e29a4b5b4aa", alt: "Tênis de treino verde-limão com sola branca e preta", estilo: "Treino", preco: 549.9, fundo: "#b2e13f", tinta: "escura", foco: "50% 70%" },
  { id: "1605408499391-6368c628ef42", alt: "Tênis de treino preto com sola caramelo", estilo: "Academia", preco: 449.9, fundo: "#ecbce8", tinta: "escura", foco: "50% 64%" },
];

export const GALERIA: { id: string; alt: string }[] = [
  { id: "1514989940723-e8e51635b782", alt: "Pessoa de calça jeans com tênis laranja e branco na calçada" },
  { id: "1552346154-21d32810aba3", alt: "Par de tênis vermelho e preto de cano alto numa quadra" },
  { id: "1600181516264-3ea807ff44b9", alt: "Pés de alguém de calça branca calçando tênis vermelho e branco" },
  { id: "1560769629-975ec94e6a86", alt: "Dois tênis coloridos sobre um bloco branco" },
  { id: "1549298916-b41d501d3772", alt: "Tênis caramelo de lona sobre um tecido de veludo mostarda" },
  { id: "1595950653106-6c9ebd614d3a", alt: "Tênis em tons pastel sobre fundo rosa e lilás" },
  { id: "1551107696-a4b0c5a0d9a2", alt: "Tênis rosa e cinza sobre um tecido preto felpudo" },
  { id: "1584735175315-9d5df23860e6", alt: "Tênis de cano alto com sola caramelo sobre papel amassado" },
  { id: "1597045566677-8cf032ed6634", alt: "Tênis preto, branco e vermelho pendurado pelo cadarço" },
  { id: "1600269452121-4f2416e55c28", alt: "Tênis branco de couro sobre roupas pretas" },
];

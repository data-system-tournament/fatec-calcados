// Regras e textos fixos da interface.
// Os dados (produtos, clientes, alertas, ações...) virão do backend.

export const REGISTER_NAME = "Caixa 01";

// Desconto que cada nível ganha no caixa
export const LEVEL_DISCOUNT = { Bronze: 0, Prata: 0.1, Ouro: 0.2 };
export const LEVELS = Object.keys(LEVEL_DISCOUNT);

export const PAYMENT_METHODS = ["Pix", "Crédito", "Débito", "Dinheiro"];
export const PIX_POINTS_BONUS = 0.1; // Pix ganha 10% a mais de pontos
export const SIGNUP_BONUS_POINTS = 50;
export const MANAGER_DISCOUNTS = [0.05, 0.1, 0.15];

// Horário comercial: sangria fora dele gera alerta no antifraude
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 18;

// Horas mostradas no gráfico de vendas do dia
export const CHART_HOURS = ["8h", "9h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h", "19h"];

export const RFM_GROUPS = [
  { name: "Campeões", tip: "Compram muito e com frequência. Ofereça acesso antecipado a lançamentos.", action: "Convidar para pré-venda" },
  { name: "Leais", tip: "Compram sempre, ticket médio. Um bônus de pontos incentiva subir de nível.", action: "Enviar bônus de 100 pts" },
  { name: "Aquecidos", tip: "Duas compras recentes. Estão a um passo de virar leais.", action: "Enviar cupom de 2ª compra" },
  { name: "Novos", tip: "Primeira compra nos últimos 30 dias. Hora de dar boas-vindas.", action: "Enviar boas-vindas" },
  { name: "Em risco", tip: "Eram frequentes e não compram há 45+ dias.", action: "Enviar cupom de 150 pts" },
  { name: "Sumindo", tip: "60+ dias sem comprar. Última chance antes de perder o cliente.", action: "Enviar WhatsApp" },
];

import type { BoardSpace, NewsCard } from '@/types/game';

export const BOARD_SIZE = 40;
export const START_POSITION = 1;
export const JAIL_POSITION = 11;
export const GO_TO_JAIL_POSITION = 31;
export const INITIAL_ROUND_BONUS = 2000;
export const ROUND_BONUS_INCREMENT = 1000;
export const ROUND_BONUS_INTERVAL = 10;
export const JAIL_MAX_DICE_ATTEMPTS = 3;

export const BOARD_SPACES: BoardSpace[] = [
  { index: 1, name: 'Início', kind: 'START', title_id: null, amount: null },
  {
    index: 2,
    name: 'Av. 9 de Julho',
    kind: 'LAND',
    title_id: 'av-9-de-julho',
    amount: null,
  },
  {
    index: 3,
    name: 'Av. Brasil',
    kind: 'LAND',
    title_id: 'av-brasil',
    amount: null,
  },
  {
    index: 4,
    name: 'Ações do banco',
    kind: 'STOCK',
    title_id: 'banco',
    amount: null,
  },
  {
    index: 5,
    name: 'Av. Beira Mar',
    kind: 'LAND',
    title_id: 'av-beira-mar',
    amount: null,
  },
  {
    index: 6,
    name: 'Av. Rio Branco',
    kind: 'LAND',
    title_id: 'av-rio-branco',
    amount: null,
  },
  { index: 7, name: 'Notícias', kind: 'NEWS', title_id: null, amount: null },
  {
    index: 8,
    name: 'Av. do Estado',
    kind: 'LAND',
    title_id: 'av-do-estado',
    amount: null,
  },
  {
    index: 9,
    name: 'Ações da Estrela Card',
    kind: 'STOCK',
    title_id: 'estrela-card',
    amount: null,
  },
  {
    index: 10,
    name: 'Av. do Contorno',
    kind: 'LAND',
    title_id: 'av-do-contorno',
    amount: null,
  },
  { index: 11, name: 'Prisão', kind: 'JAIL', title_id: null, amount: null },
  { index: 12, name: 'Notícias', kind: 'NEWS', title_id: null, amount: null },
  {
    index: 13,
    name: 'Av. Rebouças',
    kind: 'LAND',
    title_id: 'av-reboucas',
    amount: null,
  },
  {
    index: 14,
    name: 'Av. Santo Amaro',
    kind: 'LAND',
    title_id: 'av-santo-amaro',
    amount: null,
  },
  {
    index: 15,
    name: 'Ações do e-commerce',
    kind: 'STOCK',
    title_id: 'ecommerce',
    amount: null,
  },
  {
    index: 16,
    name: 'Av. da Consolação',
    kind: 'LAND',
    title_id: 'r-da-consolacao',
    amount: null,
  },
  {
    index: 17,
    name: 'Restituição do imposto de renda',
    kind: 'TAX_REFUND',
    title_id: null,
    amount: 2000,
  },
  {
    index: 18,
    name: 'Av. Morumbi',
    kind: 'LAND',
    title_id: 'av-morumbi',
    amount: null,
  },
  {
    index: 19,
    name: 'Av. Higienópolis',
    kind: 'LAND',
    title_id: 'av-higienopolis',
    amount: null,
  },
  {
    index: 20,
    name: 'Av. São João',
    kind: 'LAND',
    title_id: 'av-sao-joao',
    amount: null,
  },
  { index: 21, name: 'Feriado', kind: 'HOLIDAY', title_id: null, amount: null },
  {
    index: 22,
    name: 'Av. Ipiranga',
    kind: 'LAND',
    title_id: 'av-ipiranga',
    amount: null,
  },
  {
    index: 23,
    name: 'Ações da petroleira',
    kind: 'STOCK',
    title_id: 'petroleira',
    amount: null,
  },
  {
    index: 24,
    name: 'Receita Federal',
    kind: 'FEDERAL_TAX',
    title_id: null,
    amount: 2000,
  },
  { index: 25, name: 'Notícias', kind: 'NEWS', title_id: null, amount: null },
  {
    index: 26,
    name: 'Av. Brigadeiro Faria Lima',
    kind: 'LAND',
    title_id: 'av-brigadeiro-faria-lima',
    amount: null,
  },
  {
    index: 27,
    name: 'Av. Paulista',
    kind: 'LAND',
    title_id: 'av-paulista',
    amount: null,
  },
  { index: 28, name: 'Notícias', kind: 'NEWS', title_id: null, amount: null },
  {
    index: 29,
    name: 'Av. Recife',
    kind: 'LAND',
    title_id: 'av-recife',
    amount: null,
  },
  {
    index: 30,
    name: 'Ações da companhia aérea',
    kind: 'STOCK',
    title_id: 'companhia-aerea',
    amount: null,
  },
  {
    index: 31,
    name: 'Vá para a prisão',
    kind: 'GO_TO_JAIL',
    title_id: null,
    amount: null,
  },
  {
    index: 32,
    name: 'Av. Juscelino Kubitschek',
    kind: 'LAND',
    title_id: 'av-juscelino-kubitschek',
    amount: null,
  },
  { index: 33, name: 'Notícias', kind: 'NEWS', title_id: null, amount: null },
  {
    index: 34,
    name: 'Rua Oscar Freire',
    kind: 'LAND',
    title_id: 'rua-oscar-freire',
    amount: null,
  },
  {
    index: 35,
    name: 'Av. Ibirapuera',
    kind: 'LAND',
    title_id: 'av-ibirapuera',
    amount: null,
  },
  {
    index: 36,
    name: 'Av. Vieira Souto',
    kind: 'LAND',
    title_id: 'av-vieira-souto',
    amount: null,
  },
  {
    index: 37,
    name: 'Ações da emissora de TV',
    kind: 'STOCK',
    title_id: 'emissora-de-tv',
    amount: null,
  },
  {
    index: 38,
    name: 'Av. Presidente Vargas',
    kind: 'LAND',
    title_id: 'av-presidente-vargas',
    amount: null,
  },
  { index: 39, name: 'Notícias', kind: 'NEWS', title_id: null, amount: null },
  {
    index: 40,
    name: 'Av. Niemeyer',
    kind: 'LAND',
    title_id: 'av-niemeyer',
    amount: null,
  },
];

export const NEWS_CARDS: NewsCard[] = [
  {
    id: 'luck-01',
    action:
      'Sua barraca de limonada fez sucesso no recreio. Receba pelo lucro das vendas.',
    type: 'LUCK',
    amount: 1000,
  },
  {
    id: 'setback-01',
    action:
      'Você comprou copos coloridos demais para sua lojinha. Ajuste o caixa e aprenda a planejar melhor.',
    type: 'SETBACK',
    amount: 500,
  },
  {
    id: 'luck-02',
    action:
      'Você criou um cartaz muito chamativo e atraiu novos clientes para seu negócio.',
    type: 'LUCK',
    amount: 1200,
  },
  {
    id: 'setback-02',
    action:
      'Você esqueceu de comparar preços antes de comprar materiais. Pague a diferença do fornecedor mais caro.',
    type: 'SETBACK',
    amount: 700,
  },
  {
    id: 'luck-03',
    action:
      'Seu vídeo divertido divulgando a loja viralizou entre os amigos. Receba novas vendas.',
    type: 'LUCK',
    amount: 1500,
  },
  {
    id: 'setback-03',
    action:
      'Você prometeu entrega rápida demais e precisou contratar uma ajudinha extra.',
    type: 'SETBACK',
    amount: 600,
  },
  {
    id: 'luck-04',
    action:
      'Um cliente gostou tanto do atendimento que indicou sua loja para a família inteira.',
    type: 'LUCK',
    amount: 1800,
  },
  {
    id: 'setback-04',
    action:
      'Você colocou etiquetas com o preço errado e precisou refazer a organização da prateleira.',
    type: 'SETBACK',
    amount: 400,
  },
  {
    id: 'luck-05',
    action: 'Você lançou uma promoção de combo e vendeu mais do que esperava.',
    type: 'LUCK',
    amount: 2000,
  },
  {
    id: 'setback-05',
    action:
      'Você escolheu uma embalagem bonita, mas grande demais. Pague o custo extra da embalagem.',
    type: 'SETBACK',
    amount: 800,
  },
  {
    id: 'luck-06',
    action:
      'Sua ideia de cartão fidelidade encantou os clientes. Receba pelo aumento nas compras.',
    type: 'LUCK',
    amount: 1300,
  },
  {
    id: 'setback-06',
    action:
      'Você esqueceu de anotar uma venda no controle financeiro. Faça uma revisão no caixa.',
    type: 'SETBACK',
    amount: 500,
  },
  {
    id: 'luck-07',
    action:
      'Você fez uma vitrine criativa com desenhos e adesivos. As vendas aumentaram.',
    type: 'LUCK',
    amount: 1600,
  },
  {
    id: 'setback-07',
    action:
      'Você comprou muitos brindes para a promoção e precisou equilibrar melhor o orçamento.',
    type: 'SETBACK',
    amount: 900,
  },
  {
    id: 'luck-08',
    action:
      'Um influenciador mirim visitou sua lojinha e recomendou seus produtos.',
    type: 'LUCK',
    amount: 2200,
  },
  {
    id: 'setback-08',
    action:
      'Você esqueceu de conferir o troco e precisou ajustar o caixa no fim do dia.',
    type: 'SETBACK',
    amount: 300,
  },
  {
    id: 'luck-09',
    action:
      'Você organizou uma feira de trocas e ganhou uma comissão pelas negociações.',
    type: 'LUCK',
    amount: 1400,
  },
  {
    id: 'setback-09',
    action:
      'Você anunciou um produto antes de preparar o estoque. Pague uma taxa de reorganização.',
    type: 'SETBACK',
    amount: 700,
  },
  {
    id: 'luck-10',
    action:
      'Sua loja recebeu o prêmio de atendimento mais simpático do bairro.',
    type: 'LUCK',
    amount: 1700,
  },
  {
    id: 'setback-10',
    action:
      'Você decorou a loja com muitos balões e precisou comprar fita adesiva extra.',
    type: 'SETBACK',
    amount: 400,
  },
  {
    id: 'luck-11',
    action:
      'Você negociou bem com o fornecedor e conseguiu desconto nos produtos.',
    type: 'LUCK',
    amount: 1100,
  },
  {
    id: 'setback-11',
    action:
      'Você fez uma placa pequena demais e quase ninguém viu a promoção. Invista em uma placa melhor.',
    type: 'SETBACK',
    amount: 600,
  },
  {
    id: 'luck-12',
    action:
      'Você criou um nome divertido para sua marca e os clientes adoraram.',
    type: 'LUCK',
    amount: 1000,
  },
  {
    id: 'setback-12',
    action:
      'Você testou uma nova ideia que ainda não deu certo. Pague o custo do aprendizado.',
    type: 'SETBACK',
    amount: 800,
  },
  {
    id: 'luck-13',
    action:
      'Você montou um clube de assinaturas de doces e recebeu pagamentos antecipados.',
    type: 'LUCK',
    amount: 2500,
  },
  {
    id: 'setback-13',
    action:
      'Você se empolgou na decoração do balcão e passou um pouco do orçamento.',
    type: 'SETBACK',
    amount: 500,
  },
  {
    id: 'luck-14',
    action:
      'Um cliente fez uma encomenda grande para uma festa de aniversário.',
    type: 'LUCK',
    amount: 2300,
  },
  {
    id: 'setback-14',
    action:
      'Você esqueceu de separar moedas para o troco. Faça uma pequena reposição no caixa.',
    type: 'SETBACK',
    amount: 300,
  },
  {
    id: 'luck-15',
    action:
      'Você criou uma promoção de “leve 3 e pague 2” e o movimento cresceu bastante.',
    type: 'LUCK',
    amount: 1900,
  },
  {
    id: 'setback-15',
    action:
      'Você imprimiu panfletos com uma cor muito fraca. Refaça a divulgação com mais capricho.',
    type: 'SETBACK',
    amount: 700,
  },
  {
    id: 'luck-16',
    action:
      'Você aprendeu a organizar melhor o estoque e encontrou produtos que ainda podia vender.',
    type: 'LUCK',
    amount: 900,
  },
  {
    id: 'setback-16',
    action:
      'Você comprou uma calculadora nova para evitar erros nas próximas vendas.',
    type: 'SETBACK',
    amount: 400,
  },
  {
    id: 'luck-17',
    action: 'Sua loja ganhou destaque no jornalzinho da escola.',
    type: 'LUCK',
    amount: 1600,
  },
  {
    id: 'setback-17',
    action:
      'Você esqueceu de colocar preço em alguns produtos e precisou fazer uma nova organização.',
    type: 'SETBACK',
    amount: 500,
  },
  {
    id: 'luck-18',
    action:
      'Você fez uma parceria com outro jogador e os dois venderam mais juntos.',
    type: 'LUCK',
    amount: 2100,
  },
  {
    id: 'setback-18',
    action:
      'Você aceitou muitas encomendas ao mesmo tempo e precisou pagar um ajudante temporário.',
    type: 'SETBACK',
    amount: 1000,
  },
  {
    id: 'luck-19',
    action:
      'Você criou um mascote para sua marca e ele virou sucesso entre as crianças.',
    type: 'LUCK',
    amount: 1300,
  },
  {
    id: 'setback-19',
    action:
      'Você comprou adesivos que não combinavam com a marca. Troque por um material melhor.',
    type: 'SETBACK',
    amount: 600,
  },
  {
    id: 'luck-20',
    action:
      'Você vendeu produtos personalizados com o nome dos clientes e recebeu pedidos extras.',
    type: 'LUCK',
    amount: 2000,
  },
  {
    id: 'setback-20',
    action:
      'Você fez uma promoção sem calcular bem o lucro. Ajuste a estratégia e pague o aprendizado.',
    type: 'SETBACK',
    amount: 900,
  },
  {
    id: 'luck-21',
    action:
      'Você participou de uma feirinha empreendedora e ganhou muitos novos clientes.',
    type: 'LUCK',
    amount: 2400,
  },
  {
    id: 'setback-21',
    action:
      'Você colocou muitos produtos na vitrine e ela ficou confusa. Reorganize a apresentação.',
    type: 'SETBACK',
    amount: 500,
  },
  {
    id: 'luck-22',
    action:
      'Você criou um pacote especial de aniversário e recebeu várias encomendas.',
    type: 'LUCK',
    amount: 2200,
  },
  {
    id: 'setback-22',
    action:
      'Você esqueceu de atualizar o catálogo e precisou imprimir uma nova versão.',
    type: 'SETBACK',
    amount: 600,
  },
  {
    id: 'luck-23',
    action:
      'Você fez uma pesquisa com os clientes e descobriu um produto campeão de vendas.',
    type: 'LUCK',
    amount: 1500,
  },
  {
    id: 'setback-23',
    action:
      'Você comprou um produto que vendia devagar. Faça uma promoção criativa para girar o estoque.',
    type: 'SETBACK',
    amount: 800,
  },
  {
    id: 'luck-24',
    action: 'Você treinou seu atendimento e ganhou gorjetas pela simpatia.',
    type: 'LUCK',
    amount: 1000,
  },
  {
    id: 'setback-24',
    action:
      'Você esqueceu de conferir os horários da feirinha e chegou um pouco atrasado. Pague a taxa de organização.',
    type: 'SETBACK',
    amount: 400,
  },
  {
    id: 'luck-25',
    action:
      'Você criou uma ideia tão boa que outro jogador pagou para usar sua consultoria mirim.',
    type: 'LUCK',
    amount: 3000,
  },
  {
    id: 'setback-25',
    action:
      'Você testou uma campanha engraçada, mas ela precisou de ajustes. Invista em uma nova tentativa.',
    type: 'SETBACK',
    amount: 700,
  },
];

export const getBoardSpace = (position: number) =>
  BOARD_SPACES.find((space) => space.index === position) ?? BOARD_SPACES[0];

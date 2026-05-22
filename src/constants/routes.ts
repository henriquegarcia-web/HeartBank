export const APP_ROUTES = {
  home: '/',
  defineName: '/sala/:code/nome',
  gameRoom: '/sala/:code/jogador/:playerId',
  notFound: '*',
} as const;

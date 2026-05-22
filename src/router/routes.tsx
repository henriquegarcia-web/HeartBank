import { Route, Routes } from 'react-router-dom';

import { APP_ROUTES } from '@/constants/routes';
import { DefineName, GameRoom, Home, NotFound } from '@/pages';

export function AppRouter() {
  return (
    <Routes>
      <Route path={APP_ROUTES.home} element={<Home />} />
      <Route path={APP_ROUTES.defineName} element={<DefineName />} />
      <Route path={APP_ROUTES.gameRoom} element={<GameRoom />} />
      <Route path={APP_ROUTES.notFound} element={<NotFound />} />
    </Routes>
  );
}

import { Route, Routes } from 'react-router-dom';

import { APP_ROUTES } from '@/constants/routes';
import { Home, NotFound } from '@/pages';

export function AppRouter() {
  return (
    <Routes>
      <Route path={APP_ROUTES.home} element={<Home />} />
      <Route path={APP_ROUTES.notFound} element={<NotFound />} />
    </Routes>
  );
}

import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AppLayout } from '@/components/ui';
import { APP_ROUTES } from '@/constants/routes';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <Result
        status="404"
        title={t('pages.notFound.title')}
        subTitle={t('pages.notFound.subtitle')}
        extra={
          <Link to={APP_ROUTES.home}>
            <Button type="primary">{t('pages.notFound.action')}</Button>
          </Link>
        }
      />
    </AppLayout>
  );
}

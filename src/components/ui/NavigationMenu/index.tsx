import { Menu, type MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';

import { APP_ROUTES } from '@/constants/routes';

export function NavigationMenu() {
  const { t } = useTranslation();

  const items: MenuProps['items'] = [
    {
      key: APP_ROUTES.home,
      label: t('navigation.home'),
    },
  ];

  return <Menu mode="horizontal" selectable={false} items={items} />;
}

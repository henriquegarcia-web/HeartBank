import { Button, Layout, Space } from 'antd';
import { useTranslation } from 'react-i18next';

import { Logo } from '../Logo';
import { NavigationMenu } from '../NavigationMenu';

export function AppHeader() {
  const { t } = useTranslation();

  return (
    <Layout.Header
      style={{
        alignItems: 'center',
        background: '#fff',
        display: 'flex',
        gap: 24,
        paddingInline: 24,
      }}
    >
      <Logo />
      <div style={{ flex: 1 }}>
        <NavigationMenu />
      </div>
      <Space>
        <Button type="primary">{t('common.submit')}</Button>
      </Space>
    </Layout.Header>
  );
}

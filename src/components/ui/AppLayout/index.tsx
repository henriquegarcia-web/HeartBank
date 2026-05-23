import { Layout } from 'antd';
import type { PropsWithChildren } from 'react';

import { AppHeader } from '../AppHeader';

type AppLayoutProps = PropsWithChildren<{
  headerTitle?: string;
}>;

export function AppLayout({ children, headerTitle }: AppLayoutProps) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader title={headerTitle} />
      <Layout.Content style={{ padding: 14, paddingTop: 64 }}>
        {children}
      </Layout.Content>
    </Layout>
  );
}

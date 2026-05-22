import { Layout } from 'antd';
import type { PropsWithChildren } from 'react';

import { AppFooter } from '../AppFooter';
import { AppHeader } from '../AppHeader';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Layout.Content style={{ padding: 24 }}>{children}</Layout.Content>
      <AppFooter />
    </Layout>
  );
}

import { Layout } from 'antd';
import type { PropsWithChildren } from 'react';

import { AppHeader } from '../AppHeader';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Layout.Content style={{ padding: 14 }}>{children}</Layout.Content>
    </Layout>
  );
}

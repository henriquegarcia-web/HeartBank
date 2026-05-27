import { Layout } from 'antd';
import type { PropsWithChildren, ReactNode } from 'react';

import { AppHeader } from '../AppHeader';

type AppLayoutProps = PropsWithChildren<{
  headerLeftAction?: ReactNode;
  headerTitle?: string;
  headerRightAction?: ReactNode;
}>;

export function AppLayout({
  children,
  headerLeftAction,
  headerTitle,
  headerRightAction,
}: AppLayoutProps) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader
        leftAction={headerLeftAction}
        title={headerTitle}
        rightAction={headerRightAction}
      />
      <Layout.Content style={{ padding: 14, paddingTop: 64 }}>
        {children}
      </Layout.Content>
    </Layout>
  );
}

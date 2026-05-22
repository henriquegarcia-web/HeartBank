import { Layout } from 'antd';

import { Logo } from '../Logo';

export function AppHeader() {
  return (
    <Layout.Header
      style={{
        alignItems: 'center',
        background: '#fff',
        display: 'flex',
        justifyContent: 'center',
        paddingInline: 24,
        height: 50
      }}
    >
      <Logo />
    </Layout.Header>
  );
}

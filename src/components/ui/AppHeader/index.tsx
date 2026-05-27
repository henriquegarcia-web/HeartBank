import { Layout, Typography } from 'antd';
import type { ReactNode } from 'react';

import { Logo } from '../Logo';

type AppHeaderProps = {
  leftAction?: ReactNode;
  title?: string;
  rightAction?: ReactNode;
};

export function AppHeader({ leftAction, title, rightAction }: AppHeaderProps) {
  return (
    <Layout.Header
      style={{
        alignItems: 'center',
        background: '#fff',
        display: 'flex',
        justifyContent: 'center',
        paddingInline: 24,
        height: 50,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1001,
      }}
    >
      {leftAction ? (
        <div style={{ left: 14, position: 'absolute' }}>{leftAction}</div>
      ) : null}
      {title ? (
        <>
          <Typography.Text strong>{title}</Typography.Text>
          {rightAction ? (
            <div style={{ position: 'absolute', right: 14 }}>{rightAction}</div>
          ) : null}
        </>
      ) : (
        <Logo />
      )}
    </Layout.Header>
  );
}

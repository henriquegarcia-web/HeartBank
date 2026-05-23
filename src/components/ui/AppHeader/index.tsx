import { Button, Layout, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import { FaHeart } from 'react-icons/fa';

import { Logo } from '../Logo';
import { tokens } from '@/styles/tokens';

type AppHeaderProps = {
  title?: string;
};

export function AppHeader({ title }: AppHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const canGoHome = location.pathname !== '/';

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
      {canGoHome ? (
        <Button
          aria-label="Voltar ao menu"
          icon={<LuArrowLeft />}
          onClick={() => navigate('/')}
          style={{ left: 14, position: 'absolute' }}
        />
      ) : null}
      {title ? (
        <>
          <Typography.Text strong>{title}</Typography.Text>
          <FaHeart
            color={tokens.colors.primary}
            aria-hidden
            size={20}
            style={{ position: 'absolute', right: 20 }}
          />
        </>
      ) : (
        <Logo />
      )}
    </Layout.Header>
  );
}

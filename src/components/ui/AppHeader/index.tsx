import { Button, Layout } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';

import { Logo } from '../Logo';

export function AppHeader() {
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
        position: 'relative',
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
      <Logo />
    </Layout.Header>
  );
}

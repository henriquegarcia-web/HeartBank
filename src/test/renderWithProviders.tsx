import { App as AntdApp, ConfigProvider, Empty } from 'antd';
import type { PropsWithChildren, ReactElement } from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

import { antdTheme, styledTheme } from '@/styles/theme';

const renderEmpty = () => <Empty description="Nenhum dado encontrado" />;

function Providers({ children }: PropsWithChildren) {
  return (
    <RecoilRoot>
      <ConfigProvider theme={antdTheme} renderEmpty={renderEmpty}>
        <AntdApp>
          <ThemeProvider theme={styledTheme}>
            <BrowserRouter>{children}</BrowserRouter>
          </ThemeProvider>
        </AntdApp>
      </ConfigProvider>
    </RecoilRoot>
  );
}

export const renderWithProviders = (ui: ReactElement) =>
  render(ui, { wrapper: Providers });

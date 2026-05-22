import { App as AntdApp, ConfigProvider } from 'antd';
import type { PropsWithChildren, ReactElement } from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';

import { antdTheme, styledTheme } from '@/styles/theme';

function Providers({ children }: PropsWithChildren) {
  return (
    <RecoilRoot>
      <ConfigProvider theme={antdTheme}>
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

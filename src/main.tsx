import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { App as AntdApp, ConfigProvider, Empty } from 'antd';
import { ThemeProvider } from 'styled-components';

import { App } from '@/App';
import { GlobalStyles } from '@/styles/globalStyles';
import { antdTheme, styledTheme } from '@/styles/theme';
import '@/utils/i18n';

const renderEmpty = () => <Empty description="Nenhum dado encontrado" />;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RecoilRoot>
      <ConfigProvider theme={antdTheme} renderEmpty={renderEmpty}>
        <AntdApp>
          <ThemeProvider theme={styledTheme}>
            <GlobalStyles />
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ThemeProvider>
        </AntdApp>
      </ConfigProvider>
    </RecoilRoot>
  </React.StrictMode>,
);

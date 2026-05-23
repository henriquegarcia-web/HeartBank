import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    min-height: 100%;
  }

  body {
    min-height: 100%;
    margin: 0;
    color: ${({ theme }) => theme.tokens.colors.text};
    background: ${({ theme }) => theme.tokens.colors.background};
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  #root {
    min-height: 100vh;
  }

  .ant-steps-item-title {
    width: 100%;
  }

  .ant-card-head {
    min-height: 44px !important;
  }

  .ant-card-head, .ant-card-body {
    padding-inline: 16px !important;
  }
`;

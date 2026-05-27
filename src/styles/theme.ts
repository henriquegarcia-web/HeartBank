import type { ThemeConfig } from 'antd';

import { tokens } from './tokens';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: tokens.colors.primary,
    borderRadius: tokens.radii.md,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Card: {
      colorTextHeading: '#ffffff',
      headerBg: '#ee5f94',
    },
  },
};

export const styledTheme = {
  tokens,
};

export type AppTheme = typeof styledTheme;

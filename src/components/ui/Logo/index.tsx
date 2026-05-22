import { Space, Typography } from 'antd';
import { FaHeart } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

import { tokens } from '@/styles/tokens';

export function Logo() {
  const { t } = useTranslation();

  return (
    <Space align="center" size={8}>
      <FaHeart color={tokens.colors.primary} aria-hidden />
      <Typography.Text strong>{t('brand.name')}</Typography.Text>
    </Space>
  );
}

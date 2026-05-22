import { Flex, Typography } from 'antd';
import { FaHeart } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

import { tokens } from '@/styles/tokens';

export function Logo() {
  const { t } = useTranslation();

  return (
    <Flex align="center" gap={6}>
      <FaHeart
        color={tokens.colors.primary}
        aria-hidden
        size={20}
        style={{ marginBottom: -2 }}
      />
      <Typography.Text strong>{t('brand.name')}</Typography.Text>
    </Flex>
  );
}

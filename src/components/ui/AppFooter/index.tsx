import { Layout, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <Layout.Footer style={{ textAlign: 'center' }}>
      <Typography.Text type="secondary">{t('brand.name')}</Typography.Text>
    </Layout.Footer>
  );
}

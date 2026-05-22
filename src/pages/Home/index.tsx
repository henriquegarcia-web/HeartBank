import { zodResolver } from '@hookform/resolvers/zod';
import { Card, Flex, Form, Typography } from 'antd';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  PasswordInput,
  SelectInput,
  SubmitButton,
  TextInput,
} from '@/components/forms';
import { AppLayout } from '@/components/ui';
import { isFullName } from '@/utils/validators';

export function Home() {
  const { t } = useTranslation();

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t('validation.required'))
          .refine(isFullName, t('validation.invalidFullName')),
        email: z
          .string()
          .min(1, t('validation.required'))
          .email(t('validation.invalidEmail')),
        password: z.string().min(6, t('validation.minPassword')),
        profileType: z.string().min(1, t('validation.required')),
      }),
    [t],
  );

  type HomeFormValues = z.infer<typeof schema>;

  const { control, handleSubmit } = useForm<HomeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      profileType: '',
    },
  });

  const profileOptions = [
    {
      label: t('forms.profileType.customer'),
      value: 'customer',
    },
    {
      label: t('forms.profileType.manager'),
      value: 'manager',
    },
  ];

  const handleFormSubmit = (values: HomeFormValues) => {
    console.info(values);
  };

  return (
    <AppLayout>
      <Flex vertical gap={24}>
        <Flex vertical gap={4}>
          <Typography.Title level={1} style={{ margin: 0 }}>
            {t('pages.home.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            {t('pages.home.subtitle')}
          </Typography.Paragraph>
        </Flex>

        <Card
          title={t('pages.home.cardTitle')}
          styles={{ body: { maxWidth: 520 } }}
        >
          <Typography.Paragraph type="secondary">
            {t('pages.home.cardDescription')}
          </Typography.Paragraph>

          <Form
            layout="vertical"
            onFinish={handleSubmit(handleFormSubmit)}
            requiredMark={false}
          >
            <TextInput
              control={control}
              name="name"
              label={t('forms.name.label')}
              placeholder={t('forms.name.placeholder')}
            />
            <TextInput
              control={control}
              name="email"
              label={t('forms.email.label')}
              placeholder={t('forms.email.placeholder')}
            />
            <PasswordInput
              control={control}
              name="password"
              label={t('forms.password.label')}
              placeholder={t('forms.password.placeholder')}
            />
            <SelectInput
              control={control}
              name="profileType"
              label={t('forms.profileType.label')}
              placeholder={t('forms.profileType.placeholder')}
              options={profileOptions}
            />
            <SubmitButton label={t('common.submit')} />
          </Form>
        </Card>
      </Flex>
    </AppLayout>
  );
}

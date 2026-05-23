import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  'pt-BR': {
    translation: {
      common: {
        submit: 'Enviar',
        loading: 'Carregando',
      },
      navigation: {
        home: 'InÃ­cio',
      },
      brand: {
        name: 'Banco Coração',
      },
      forms: {
        name: {
          label: 'Nome completo',
          placeholder: 'Digite seu nome completo',
        },
        email: {
          label: 'E-mail',
          placeholder: 'Digite seu e-mail',
        },
        password: {
          label: 'Senha',
          placeholder: 'Digite sua senha',
        },
        profileType: {
          label: 'Tipo de perfil',
          placeholder: 'Selecione um tipo',
          customer: 'Cliente',
          manager: 'Gerente',
        },
      },
      validation: {
        required: 'Campo obrigatÃ³rio',
        invalidEmail: 'Informe um e-mail vÃ¡lido',
        invalidFullName: 'Informe nome e sobrenome',
        minPassword: 'A senha deve ter pelo menos 6 caracteres',
      },
      pages: {
        home: {
          title: 'Boilerplate React pronto para evoluir',
          subtitle:
            'Base com Ant Design, formulÃ¡rios tipados, internacionalização, Firebase e testes.',
          cardTitle: 'Cadastro inicial',
          cardDescription:
            'Exemplo funcional usando React Hook Form, Zod e componentes de formulÃ¡rio.',
        },
        notFound: {
          title: 'PÃ¡gina nÃ£o encontrada',
          subtitle: 'A rota acessada nÃ£o existe.',
          action: 'Voltar para o inÃ­cio',
        },
      },
    },
  },
  'en-US': {
    translation: {
      common: {
        submit: 'Submit',
        loading: 'Loading',
      },
      navigation: {
        home: 'Home',
      },
      brand: {
        name: 'Coração Bank',
      },
      forms: {
        name: {
          label: 'Full name',
          placeholder: 'Enter your full name',
        },
        email: {
          label: 'Email',
          placeholder: 'Enter your email',
        },
        password: {
          label: 'Password',
          placeholder: 'Enter your password',
        },
        profileType: {
          label: 'Profile type',
          placeholder: 'Select a type',
          customer: 'Customer',
          manager: 'Manager',
        },
      },
      validation: {
        required: 'Required field',
        invalidEmail: 'Enter a valid email',
        invalidFullName: 'Enter first and last name',
        minPassword: 'Password must be at least 6 characters',
      },
      pages: {
        home: {
          title: 'React boilerplate ready to grow',
          subtitle:
            'Foundation with Ant Design, typed forms, internationalization, Firebase and tests.',
          cardTitle: 'Initial signup',
          cardDescription:
            'Functional example using React Hook Form, Zod and form components.',
        },
        notFound: {
          title: 'Page not found',
          subtitle: 'The route you opened does not exist.',
          action: 'Back to home',
        },
      },
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

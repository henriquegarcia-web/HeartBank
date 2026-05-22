import { useTranslation } from 'react-i18next';
import { atom, useRecoilState } from 'recoil';

import { STORAGE_KEYS } from '@/constants/storageKeys';

const initialLanguage = localStorage.getItem(STORAGE_KEYS.language) ?? 'pt-BR';

export const languageState = atom({
  key: 'languageState',
  default: initialLanguage,
});

export function useAppLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useRecoilState(languageState);

  const setLanguage = async (nextLanguage: string) => {
    await i18n.changeLanguage(nextLanguage);
    localStorage.setItem(STORAGE_KEYS.language, nextLanguage);
    setLanguageState(nextLanguage);
  };

  return {
    language,
    setLanguage,
  };
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import uk from "./locales/uk.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";

const resources = {
  en,
  ru,
  de,
  fr,
  es,
  pt,
  uk,
  zh,
  ja,
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

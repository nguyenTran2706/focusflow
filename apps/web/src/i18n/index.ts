import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── English ──────────────────────────────────────────────────────────────────
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enBoard from './locales/en/board.json';
import enScrum from './locales/en/scrum.json';
import enDiagram from './locales/en/diagram.json';
import enWhiteboard from './locales/en/whiteboard.json';
import enAdmin from './locales/en/admin.json';
import enPricing from './locales/en/pricing.json';
import enProfile from './locales/en/profile.json';
import enErrors from './locales/en/errors.json';
import enValidation from './locales/en/validation.json';
import enLanding from './locales/en/landing.json';

// ── Vietnamese ───────────────────────────────────────────────────────────────
import viCommon from './locales/vi/common.json';
import viAuth from './locales/vi/auth.json';
import viDashboard from './locales/vi/dashboard.json';
import viBoard from './locales/vi/board.json';
import viScrum from './locales/vi/scrum.json';
import viDiagram from './locales/vi/diagram.json';
import viWhiteboard from './locales/vi/whiteboard.json';
import viAdmin from './locales/vi/admin.json';
import viPricing from './locales/vi/pricing.json';
import viProfile from './locales/vi/profile.json';
import viErrors from './locales/vi/errors.json';
import viValidation from './locales/vi/validation.json';
import viLanding from './locales/vi/landing.json';

// ── Korean ───────────────────────────────────────────────────────────────────
import koCommon from './locales/ko/common.json';
import koAuth from './locales/ko/auth.json';
import koDashboard from './locales/ko/dashboard.json';
import koBoard from './locales/ko/board.json';
import koScrum from './locales/ko/scrum.json';
import koDiagram from './locales/ko/diagram.json';
import koWhiteboard from './locales/ko/whiteboard.json';
import koAdmin from './locales/ko/admin.json';
import koPricing from './locales/ko/pricing.json';
import koProfile from './locales/ko/profile.json';
import koErrors from './locales/ko/errors.json';
import koValidation from './locales/ko/validation.json';
import koLanding from './locales/ko/landing.json';

// ── Japanese ─────────────────────────────────────────────────────────────────
import jaCommon from './locales/ja/common.json';
import jaAuth from './locales/ja/auth.json';
import jaDashboard from './locales/ja/dashboard.json';
import jaBoard from './locales/ja/board.json';
import jaScrum from './locales/ja/scrum.json';
import jaDiagram from './locales/ja/diagram.json';
import jaWhiteboard from './locales/ja/whiteboard.json';
import jaAdmin from './locales/ja/admin.json';
import jaPricing from './locales/ja/pricing.json';
import jaProfile from './locales/ja/profile.json';
import jaErrors from './locales/ja/errors.json';
import jaValidation from './locales/ja/validation.json';
import jaLanding from './locales/ja/landing.json';

// ── Chinese Simplified ───────────────────────────────────────────────────────
import zhCNCommon from './locales/zh-CN/common.json';
import zhCNAuth from './locales/zh-CN/auth.json';
import zhCNDashboard from './locales/zh-CN/dashboard.json';
import zhCNBoard from './locales/zh-CN/board.json';
import zhCNScrum from './locales/zh-CN/scrum.json';
import zhCNDiagram from './locales/zh-CN/diagram.json';
import zhCNWhiteboard from './locales/zh-CN/whiteboard.json';
import zhCNAdmin from './locales/zh-CN/admin.json';
import zhCNPricing from './locales/zh-CN/pricing.json';
import zhCNProfile from './locales/zh-CN/profile.json';
import zhCNErrors from './locales/zh-CN/errors.json';
import zhCNValidation from './locales/zh-CN/validation.json';
import zhCNLanding from './locales/zh-CN/landing.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
] as const;

export const defaultNS = 'common';
export const namespaces = [
  'common', 'auth', 'dashboard', 'board', 'scrum',
  'diagram', 'whiteboard', 'admin', 'pricing', 'profile',
  'errors', 'validation', 'landing',
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, auth: enAuth, dashboard: enDashboard, board: enBoard, scrum: enScrum, diagram: enDiagram, whiteboard: enWhiteboard, admin: enAdmin, pricing: enPricing, profile: enProfile, errors: enErrors, validation: enValidation, landing: enLanding },
      vi: { common: viCommon, auth: viAuth, dashboard: viDashboard, board: viBoard, scrum: viScrum, diagram: viDiagram, whiteboard: viWhiteboard, admin: viAdmin, pricing: viPricing, profile: viProfile, errors: viErrors, validation: viValidation, landing: viLanding },
      ko: { common: koCommon, auth: koAuth, dashboard: koDashboard, board: koBoard, scrum: koScrum, diagram: koDiagram, whiteboard: koWhiteboard, admin: koAdmin, pricing: koPricing, profile: koProfile, errors: koErrors, validation: koValidation, landing: koLanding },
      ja: { common: jaCommon, auth: jaAuth, dashboard: jaDashboard, board: jaBoard, scrum: jaScrum, diagram: jaDiagram, whiteboard: jaWhiteboard, admin: jaAdmin, pricing: jaPricing, profile: jaProfile, errors: jaErrors, validation: jaValidation, landing: jaLanding },
      'zh-CN': { common: zhCNCommon, auth: zhCNAuth, dashboard: zhCNDashboard, board: zhCNBoard, scrum: zhCNScrum, diagram: zhCNDiagram, whiteboard: zhCNWhiteboard, admin: zhCNAdmin, pricing: zhCNPricing, profile: zhCNProfile, errors: zhCNErrors, validation: zhCNValidation, landing: zhCNLanding },
    },
    fallbackLng: 'en',
    defaultNS,
    ns: namespaces as unknown as string[],
    interpolation: { escapeValue: false },
    returnNull: false,
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'focusflow.language',
      caches: ['localStorage'],
    },
  });

export default i18n;

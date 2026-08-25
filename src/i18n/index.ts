import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * 语言包按需加载：两份 locale JSON 合计约 150KB（未压缩），以前全部打进首屏包。
 * 现在只同步加载当前语言，fallback（en）在首屏渲染后于空闲时补载。
 */
const STORAGE_KEY = 'zenstats-language';
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const loaders = import.meta.glob<{ default: Record<string, unknown> }>('./locales/*.json');

export function normalizeLanguage(lang: string | null | undefined): SupportedLanguage {
  if (!lang) return 'en';
  if (lang.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en';
}

function detectInitialLanguage(): SupportedLanguage {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return normalizeLanguage(saved || navigator.language);
}

async function loadBundle(lang: SupportedLanguage): Promise<Record<string, unknown>> {
  const loader = loaders[`./locales/${lang}.json`];
  if (!loader) throw new Error(`unsupported language: ${lang}`);
  return (await loader()).default;
}

/** 确保某语言的资源已注册到 i18next（幂等）。 */
export async function ensureLanguageLoaded(lang: SupportedLanguage): Promise<void> {
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  const bundle = await loadBundle(lang);
  i18n.addResourceBundle(lang, 'translation', bundle, true, true);
}

/** 切换语言：先加载资源再切换，并持久化到 localStorage。 */
export async function changeLanguage(lang: string): Promise<void> {
  const target = normalizeLanguage(lang);
  await ensureLanguageLoaded(target);
  await i18n.changeLanguage(target);
  try {
    localStorage.setItem(STORAGE_KEY, target);
  } catch {
    /* ignore */
  }
}

const initialLanguage = detectInitialLanguage();

/** 应用在 i18n 就绪后再渲染，避免首屏闪现翻译 key。 */
export const i18nReady: Promise<void> = (async () => {
  const bundle = await loadBundle(initialLanguage);
  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { [initialLanguage]: { translation: bundle } },
      lng: initialLanguage,
      fallbackLng: 'en',
      // 只按精确代码解析（zh-CN 不再退化查找 zh），语言代码已由 normalizeLanguage 归一化。
      // 注意不要加 nonExplicitSupportedLngs：它会用主码 "zh" 去匹配 supportedLngs，
      // 导致 zh-CN 被判定为不支持而全部落到 fallback。
      supportedLngs: [...SUPPORTED_LANGUAGES],
      load: 'currentOnly',
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: STORAGE_KEY,
        caches: ['localStorage'],
      },
    });

  // fallback 语言在空闲时补载，缺失 key 时才会用到，不阻塞首屏。
  if (initialLanguage !== 'en') {
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb) : window.setTimeout(cb, 1500);
    idle(() => {
      void ensureLanguageLoaded('en');
    });
  }
})();

export default i18n;

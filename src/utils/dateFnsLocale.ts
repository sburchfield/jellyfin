import enUS from 'date-fns/locale/en-US';

const DEFAULT_LOCALE = 'en-US';

let localeString = DEFAULT_LOCALE;
let locale = enUS;

export function fetchLocale(localeName: string) {
    void localeName;
    return Promise.resolve(enUS);
}

export function normalizeLocale(localeName: string) {
    void localeName;
    return DEFAULT_LOCALE;
}

export async function updateLocale(newLocale: string) {
    console.debug('[dateFnsLocale] updating date-fns locale', newLocale);
    localeString = normalizeLocale(newLocale);
    console.debug('[dateFnsLocale] mapped to date-fns locale', localeString);
    locale = await fetchLocale(localeString);
}

export function getLocale() {
    return locale;
}

export function getLocaleWithSuffix() {
    return {
        addSuffix: true,
        locale
    };
}

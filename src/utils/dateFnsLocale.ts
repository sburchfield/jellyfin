import type { Locale } from 'date-fns';

const DEFAULT_LOCALE = 'en-US';

let localeString = DEFAULT_LOCALE;

export function fetchLocale(localeName: string) {
    void localeName;
    return Promise.resolve<Locale | undefined>(undefined);
}

export function normalizeLocale(localeName: string) {
    void localeName;
    return DEFAULT_LOCALE;
}

export async function updateLocale(newLocale: string) {
    console.debug('[dateFnsLocale] updating date-fns locale', newLocale);
    localeString = normalizeLocale(newLocale);
    console.debug('[dateFnsLocale] mapped to date-fns locale', localeString);
}

export function getLocale(): Locale | undefined {
    return undefined;
}

export function getLocaleWithSuffix() {
    return {
        addSuffix: true,
        locale: undefined as Locale | undefined
    };
}

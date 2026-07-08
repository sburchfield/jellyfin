import type { Locale } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { useMemo } from 'react';

import { getDefaultLanguage, normalizeLocaleName } from 'lib/globalize';

import { useUserSettings } from './useUserSettings';

export function useLocale() {
    const { dateTimeLocale: dateTimeSetting, language } = useUserSettings();
    const dateFnsLocale: Locale = enUS;

    const locale: string = useMemo(() => (
        normalizeLocaleName(language || getDefaultLanguage())
    ), [ language ]);

    const dateTimeLocale: string = useMemo(() => (
        dateTimeSetting ? normalizeLocaleName(dateTimeSetting) : locale
    ), [ dateTimeSetting, locale ]);

    return {
        locale,
        dateTimeLocale,
        dateFnsLocale
    };
}

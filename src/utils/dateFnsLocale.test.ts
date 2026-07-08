import { describe, expect, it } from 'vitest';
import * as dateFnsLocale from './dateFnsLocale';

describe('Utils: dateFnsLocale', () => {
    describe('Function: getLocale', () => {
        it('Should let date-fns use its built-in en-US locale by default', () => {
            expect(dateFnsLocale.getLocale()).toBeUndefined();
        });
    });

    describe('Function: getLocaleWithSuffix', () => {
        it('Should include addSuffix without forcing a locale object', () => {
            const { addSuffix, locale } = dateFnsLocale.getLocaleWithSuffix();

            expect(addSuffix).toEqual(true);
            expect(locale).toBeUndefined();
        });
    });

    describe('Function: updateLocale', () => {
        it('Should keep using the built-in en-US locale for requested locales', async () => {
            await dateFnsLocale.updateLocale('fr-ca');
            const { locale: localeWithSuffix } =
                dateFnsLocale.getLocaleWithSuffix();

            expect(dateFnsLocale.getLocale()).toBeUndefined();
            expect(localeWithSuffix).toBeUndefined();
        });
    });
});

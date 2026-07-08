const languages = [
    'en-us'
];

const locales = languages.map(lang => ({
    lang,
    path: `${lang}.json`
}));

export default locales;

'use strict';

import { __, configure, setLocale, } from 'i18n';
import { resolve } from 'path';
const config = require('../../src/config.json');

// Initialize localzation handler
configure({
    locales:['en', 'es', 'de'],
    directory: resolve(__dirname, '../../static/locales')
});

// Set locale
setLocale(config.locale);

export const getPokemonName = (id: number): string => {
    return __(`poke_${id}`);
}
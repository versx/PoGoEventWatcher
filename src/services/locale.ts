'use strict';

import { __, configure, setLocale, } from 'i18n';
import { resolve } from 'path';
import { readdirSync, readFileSync } from 'fs';

const config = JSON.parse(readFileSync(resolve(__dirname, '../../src/config.json'), { encoding: 'utf8' }));

// Initialize localzation handler
configure({
    locales: readdirSync(resolve(__dirname, '../../static/locales'))
        .filter((file) => !file.startsWith('_'))
        .map((file) => file.replace('.json', '')),
    directory: resolve(__dirname, '../../static/locales')
});

// Set locale
setLocale(config.locale);

export const getPokemonName = (id: number): string => {
    return __(`poke_${id}`);
};

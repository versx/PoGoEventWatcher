'use strict';

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';

const appLocalesFolder = resolve(__dirname, '../../static/locales');

async function createLocales() {
    const englishRef = readFileSync(resolve(appLocalesFolder, '_en.json'), { encoding: 'utf8', flag: 'r' });
    const remoteIndex: string[] = await axios.get('https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/index.json')
        .then((response) => response.data);
    
    await Promise.all(remoteIndex.map(async locale => {
        const local = existsSync(resolve(appLocalesFolder, `_${locale}`)) 
            ? readFileSync(resolve(appLocalesFolder, locale), { encoding: 'utf8', flag: 'r' })
            : englishRef;
        const baseName = locale.replace('.json', '').replace('_', '');
        const trimmedRemoteFiles: { [key: string]: string } = {};

        try {
            const { data } = await axios.get(`https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/locales/${baseName}.json`);

            Object.keys(data).forEach(key => {
                if (!key.startsWith('desc_') && !key.startsWith('pokemon_category_') && !key.startsWith('quest')) {
                    trimmedRemoteFiles[key] = data[key];
                }
            });
        } catch (e) {
            console.warn(e, '\n', locale);
        }

        const finalTranslations = {
            ...JSON.parse(englishRef),
            ...JSON.parse(local),
            ...trimmedRemoteFiles,
        };
        writeFileSync(
            resolve(appLocalesFolder, `${baseName}.json`),
            JSON.stringify(finalTranslations, null, 2),
            'utf8',
        );
        console.log(locale, 'file saved.');
    }));
}

createLocales();

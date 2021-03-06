'use strict';

import { existsSync, readdir, readdirSync, readFileSync, writeFile } from 'fs';
import { basename, resolve } from 'path';

const appLocalesFolder = resolve(__dirname, '../../static/locales');
const pogoLocalesFolder = resolve(__dirname, '../../node_modules/pogo-translations/static/locales');

readdir(appLocalesFolder, (err: NodeJS.ErrnoException | null, files: string[]) => {
    let pogoLocalesFiles: any = [];

    if (existsSync(pogoLocalesFolder)) {
        pogoLocalesFiles = readdirSync(pogoLocalesFolder);
    }

    files.filter(file => { return file.startsWith('_'); }).forEach(file => {
        const locale = basename(file, '.json').replace('_', '');
        const localeFile = locale + '.json';
        let translations = {};

        console.log('Creating locale', locale);

        if (pogoLocalesFiles.includes(localeFile)) {
            console.log('Found pogo-translations for locale', locale);

            const pogoTranslations = readFileSync(
                resolve(pogoLocalesFolder, localeFile),
                { encoding: 'utf8', flag: 'r' }
            );
            translations = JSON.parse(pogoTranslations.toString());
        }

        if (locale !== 'en') {
            // include en as fallback first
            const appTransFallback = readFileSync(
                resolve(appLocalesFolder, '_en.json'),
                { encoding: 'utf8', flag: 'r' }
            );
            translations = Object.assign(translations, JSON.parse(appTransFallback.toString()));
        }

        const appTranslations = readFileSync(resolve(appLocalesFolder, file), { encoding: 'utf8', flag: 'r' });
        translations = Object.assign(translations, JSON.parse(appTranslations.toString()));

        writeFile(
            resolve(appLocalesFolder, localeFile),
            JSON.stringify(translations, null, 2), 
            'utf8', 
            () => {}
        );
        console.log(localeFile, 'file saved.');
    });
});
'use strict';

const i18n = require('i18n');
const path = require('path');

const config = require('../config.json');

// Initialize localzation handler
i18n.configure({
    locales:['en', 'es', 'de'],
    directory: path.resolve(__dirname, '../../static/locales')
});

// Set locale
i18n.setLocale(config.locale);

const getPokemonName = (id) => {
    return i18n.__(`poke_${id}`);
};

module.exports = {
    getPokemonName,
};
'use strict';

const utils = require('../services/utils.js');

let previousData;

module.exports = (urlToWatch, interval, changedCallback) => {
    /**
     * Start checking for url address content changes
     */
    setInterval(async () => {
        const data = await utils.get(urlToWatch);
        if (!previousData) {
            previousData = data;
            return;
        }
        if (!utils.deepEqual(previousData, data)) {
            previousData = data;
            changedCallback();
        }
    }, interval);
};
'use strict';

import { NoParamCallback } from 'fs';

const utils = require('../services/utils.js');

let previousData: any;

export const UrlWatcher = (urlToWatch: string, interval: number, changedCallback: NoParamCallback) => {
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
            changedCallback(null);
        }
    }, interval);
}
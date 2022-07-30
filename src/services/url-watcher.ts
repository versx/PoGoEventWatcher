'use strict';

import { NoParamCallback } from 'fs';
import { get, deepEqual } from '../services/utils';

let previousData: any;

export const UrlWatcher = (urlToWatch: string, interval: number, changedCallback: NoParamCallback) => {
    /**
     * Start checking for url address content changes
     */
    setInterval(async () => {
        const data = await get(urlToWatch);
        if (!previousData) {
            previousData = data;
            return;
        }
        if (!deepEqual(previousData, data)) {
            previousData = data;
            changedCallback(null);
        }
    }, interval);
}
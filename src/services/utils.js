'use strict';

const axios = require('axios');

module.exports = {
    /**
     * HTTP GET request to url
     * @param {*} url Web address url to make request to
     */
    get: async (url) => {
        const req = await axios.get(url);
        if (req.status !== 200) {
            console.error(`Failed to get data from ${url}:`, req.statusText);
            return null;
        }
        return req.data;
    },
    /**
     * HTTP POST request to url with data
     * @param {*} url 
     * @param {*} data 
     */
    post: async (url, data) => {
        const req = await axios.post(url, data);
        if (req.status !== 200) {
            console.error(`Failed to post data to ${url}:`, req.statusText);
            return null;
        }
        return req.data;
    },
    /**
     * Strip PMSF icon format for raw ids
     * @param {*} ids 
     */
    stripIds: (ids) => {
        return ids.map(x => parseInt(x.replace('_00', '')));
    },
    /**
     * Deep equals between two objects
     * @param {*} object1 
     * @param {*} object2 
     */
    deepEqual: (object1, object2) => {
        const keys1 = Object.keys(object1);
        const keys2 = Object.keys(object2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        for (const key of keys1) {
            const val1 = object1[key];
            const val2 = object2[key];
            const areObjects = isObject(val1) && isObject(val2);
            if (
                areObjects && !deepEqual(val1, val2) ||
                !areObjects && val1 !== val2
            ) {
                return false;
            }
        }
        return true;
    },
    /**
     * Is object an object
     * @param {*} object 
     */
    isObject: (object) => {
        return object != null && typeof object === 'object';
    },
}
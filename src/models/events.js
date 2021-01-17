'use strict';

const locale = require('../services/locale.js');
const utils = require('../services/utils.js');

const baseUrl = 'https://raw.githubusercontent.com/ccev/pogoinfo/info/';

class PokemonEvents {

    /**
     * Returns a list of all events
     */
    static async getAll() {
        const url = baseUrl + 'events/all.json';
        const data = await utils.get(url);
        return data;
    }

    /**
     * Returns a list of active events
     */
    static async getActive() {
        const url = baseUrl + 'events/active.json';
        const data = await utils.get(url);
        return data;
    }

    /**
     * Returns dictionary of available raid bosses by level
     */
    static async getAvailableRaidBosses() {
        const url = baseUrl + 'raid-bosses.json';
        const data = await utils.get(url);
        return data;
    }

    /**
     * Returns an array of available nesting Pokemon IDs
     */
    static async getAvailableNestPokemon() {
        const url = baseUrl + 'info/nests.json';
        const data = await utils.get(url);
        return data;
    }

    /**
     * Returns the unix timestamp of the last next migration
     */
    static async getLastNestMigration() {
        const url = baseUrl + 'last-nest-migration';
        const data = await utils.get(url);
        return data;
    }

    /**
     * Returns the active invasion grunt types dictionary
     */
    static async getAvailableGrunts() {
        const url = baseUrl + 'grunts.json';
        const data = await utils.get(url);
        return data;
    }

    /**
     * Build event object from active events endpoint
     */
    static async buildActiveEvent() {
        const active = await this.getActive();
        const lastNestMigrationTimestamp = await this.getLastNestMigration();
        const obj = {
            name: active.name,
            start: active.start ? new Date(active.start).toLocaleString() : null,
            end: new Date(active.end).toLocaleString(),
            lastNestMigration: new Date(lastNestMigrationTimestamp * 1000).toLocaleString(),
            bonuses: (active.details.bonuses || []).join('\n- '),
            eggs: utils.stripIds(active.details.eggs),
            spawns: utils.stripIds(active.details.spawns),
            raids: Object.keys(active.details.raids)
                .map(x => `Level ${x}: ` + utils.stripIds(active.details.raids[x]).map(y => locale.getPokemonName(y))
                    .join(', ')),
            nests: await this.getAvailableNestPokemon(),
        };
        return obj;
    }

    static async getActiveEvents(sorted = true) {
        // Get all events
        const allEvents = await PokemonEvents.getAll();
        // Now timestamp in seconds
        const now = new Date() / 1000;
        // Filter for only active evnets within todays date
        const activeEvents = allEvents.filter(x => new Date(x.start) / 1000 < now && now < new Date(x.end) / 1000);
        // Check if no active events available
        if (activeEvents.length === 0) {
            // No active events
            return null;
        }
        if (sorted) {
            // Sort active events by end date
            activeEvents.sort((a, b) => new Date(a.end) - new Date(b.end));
        }
        return activeEvents;
    }
}

module.exports = PokemonEvents;
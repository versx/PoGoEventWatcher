'use strict';

import { getPokemonName } from '../services/locale';
import { get, stripIds, } from '../services/utils';
import { ActiveEvent, ActiveRaidsDictionary } from '../types/events';

const baseUrl = 'https://raw.githubusercontent.com/ccev/pogoinfo/v2/';

// TODO: Create reusable generics method

export class PokemonEvents {

    /**
     * Returns a list of all events
     */
    public static async getAll(active: boolean = false, sorted: boolean = false): Promise<ActiveEvent[]> {
        const url = baseUrl + 'active/events.json';
        const data = await get(url);
        const events = <ActiveEvent[]>data;
        if (!active) {
            return events;
        }
        // Now timestamp in seconds
        const now = new Date().getTime() / 1000;
        // Filter for only active evnets within todays date
        const activeEvents = events.filter((event: ActiveEvent) => new Date(event.start).getTime() / 1000 <= now && now < new Date(event.end).getTime() / 1000);
        // Check if no active events available
        if (activeEvents.length === 0) {
            // No active events
            return [];
        }
        if (sorted) {
            // Sort active events by end date
            activeEvents.sort((a: ActiveEvent, b: ActiveEvent) => new Date(a.end).getTime() - new Date(b.end).getTime());
        }
        return activeEvents;
    }

    /**
     * Returns dictionary of available raid bosses by level
     */
    public static async getAvailableRaidBosses(): Promise<ActiveRaidsDictionary> {
        const url = baseUrl + 'active/raids.json';
        const data = await get(url);
        return <ActiveRaidsDictionary>data;
    }

    /**
     * Returns an array of available nesting Pokemon IDs
     */
    public static async getAvailableNestPokemon(): Promise<number[]> {
        const url = baseUrl + 'nests/species_ids.json';
        const data = await get(url);
        return <number[]>data;
    }

    /**
     * Returns the unix timestamp of the last next migration
     */
    public static async getLastNestMigration(): Promise<number | undefined | null> {
        const url = baseUrl + 'nests/last-regular-migration';
        const data = await get(url);
        return <number>data;
    }

    /**
     * Returns the active invasion grunt types dictionary
     */
    public static async getAvailableGrunts() {
        const url = baseUrl + 'active/grunts.json';
        const data = await get(url);
        return data;
    }

    /**
     * 
     */
    public static async getAvailableQuests() {
        const url = baseUrl + 'active/quests.json';
        const data = await get(url);
        return data;
    }
}

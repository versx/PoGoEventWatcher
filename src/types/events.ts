'use strict';

export interface ActiveEvent {
    name: string;
    type: string;
    start: string;
    end: string;
    spawns: EventSpawn[];
    eggs: EventRaid[];
    shinies: EventShiny[];
    bonuses: EventBonus[];
    features: string[];
    has_quests: boolean;
    has_spawnpoints: boolean;
}

export interface EventSpawn extends ActiveEventItem {
}

export interface EventRaid extends ActiveEventItem {
}

export interface EventShiny extends ActiveEventItem {
}

export interface EventQuest extends ActiveEventItem {
}

export interface EventQuestReward {
    type: string;
    reward: EventQuest;
}

export interface ActiveEventItem {
    id: number;
    template: string;
    form: number | undefined | null;
}

export interface ActiveRaidsDictionary {
    [key: string]: EventRaid[];
}

export interface InvasionCharacter {
    template: string;
    gender: number;
    boss: boolean;
    type: InvasionType;
}

export interface InvasionType {
    id: number;
    name: string;
}

export interface InvasionLineup extends ActiveEventItem {
}

export interface ActiveInvasionGrunt {
    active: boolean;
    character: InvasionCharacter;
    lineup: { rewards: number[], team: Array<InvasionLineup[]> };
}

export interface EventBonus {
    text: string;
    template: string;
    value: string;
}


/*
    {
        "name": "Increased Trade Distance (Lunar New Year)",
        "type": "event",
        "start": "2021-02-08 22:00",
        "end": "2021-02-15 22:00",
        "spawns": [],
        "eggs": [],
        "shinies": [],
        "bonuses": [],
        "features": [],
        "has_quests": false,
        "has_spawnpoints": false
    },


    "7": {
        "active": true,
        "character": {
            "template": "CHARACTER_BUG_GRUNT_MALE",
            "gender": 1,
            "boss": false,
            "type": {
                "id": 7,
                "name": "BUG"
            }
        },
        "lineup": {
            "rewards": [
                0
            ],
            "team": [
                [
                    {
                        "id": 347,
                        "template": "ANORITH_SHADOW",
                        "form": 1575
                    },
                    {
                        "id": 213,
                        "template": "SHUCKLE_SHADOW",
                        "form": 828
                    },
                    {
                        "id": 48,
                        "template": "VENONAT_SHADOW",
                        "form": 260
                    }
                ],
                [
                    {
                        "id": 127,
                        "template": "PINSIR_SHADOW",
                        "form": 899
                    },
                    {
                        "id": 212,
                        "template": "SCIZOR_SHADOW",
                        "form": 251
                    },
                    {
                        "id": 49,
                        "template": "VENOMOTH_SHADOW",
                        "form": 263
                    }
                ],
                [
                    {
                        "id": 15,
                        "template": "BEEDRILL_SHADOW",
                        "form": 623
                    },
                    {
                        "id": 123,
                        "template": "SCYTHER_SHADOW",
                        "form": 248
                    },
                    {
                        "id": 212,
                        "template": "SCIZOR_SHADOW",
                        "form": 251
                    }
                ]
            ]
        }
    },
*/
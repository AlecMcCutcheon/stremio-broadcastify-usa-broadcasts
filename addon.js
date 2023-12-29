const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const { addonBuilder } = require('stremio-addon-sdk');


const getStates = () => [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska",
    "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
    "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const manifest = {
    id: "com.mixtape.broadcastify",
    version: "1.0.2",
    name: "Broadcastify USA Broadcasts",
    description: "Stremio Add-On to listen to public safety broadcasts from different US States on Broadcastify",
    types: ["radio"],
    catalogs: [
        {
            type: "radio",
            id: "broadcastify_usa_broadcasts",
            name: "Broadcastify USA Broadcasts",
            extra: [{ genres: getStates() }]  // <-- Corrected this line
        }
    ],
    resources: ["catalog", "stream"],
    idPrefixes: ["broadcastify_states"]
};


const builder = new addonBuilder(manifest);

const replaceSTID = (state) => {
    const stidMap = {
        "Alabama": "1", "Alaska": "2", "Arizona": "4", "Arkansas": "5", "California": "6",
        "Colorado": "8", "Connecticut": "9", "Delaware": "10", "District of Columbia": "11",
        "Florida": "12", "Georgia": "13", "Hawaii": "15", "Idaho": "16",
        "Illinois": "17", "Indiana": "18", "Iowa": "19", "Kansas": "20", "Kentucky": "21",
        "Louisiana": "22", "Maine": "23", "Maryland": "24", "Massachusetts": "25", "Michigan": "26",
        "Minnesota": "27", "Mississippi": "28", "Missouri": "29", "Montana": "30", "Nebraska": "31",
        "Nevada": "32", "New Hampshire": "33", "New Jersey": "34", "New Mexico": "35", "New York": "36",
        "North Carolina": "37", "North Dakota": "38", "Ohio": "39", "Oklahoma": "40", "Oregon": "41",
        "Pennsylvania": "42", "Rhode Island": "44", "South Carolina": "45",
        "South Dakota": "46", "Tennessee": "47", "Texas": "48", "Utah": "49", "Vermont": "50",
        "Virginia": "51", "Washington": "53", "West Virginia": "54",
        "Wisconsin": "55", "Wyoming": "56"
    };

    return stidMap[state] || null;
};


const fetchDataFromBroadcastify = async (state) => {
    try {
        const stid = replaceSTID(state);
        if (!stid) {
            throw new Error('Invalid state');
        }

        const response = await fetch(`https://www.broadcastify.com/listen/stid/${stid}/publicsafety`);
        const html = await response.text();
        const dom = new JSDOM(html);

        const table = dom.window.document.querySelector('.btable');
        const rows = table.querySelectorAll('tr');

        const data = {};

        for (let i = 1; i < rows.length; i++) {
            const columns = rows[i].querySelectorAll('td');
            const county = columns[0].textContent.trim();
            const feed = columns[1].textContent.trim();
            const genre = columns[2].textContent.trim();
            const listeners = parseInt(columns[3].textContent.trim(), 10);
            const links = columns[4].querySelector('a').getAttribute('href');
            const status = columns[5].textContent.trim();

            if (status === 'Online' && genre === 'Public Safety') {
                if (!data[county]) {
                    data[county] = [];
                }

                data[county].push({
                    feed,
                    genre,
                    listeners,
                    links: `https://broadcastify.cdnstream1.com/${links.split('/').pop()}`,
                    status,
                });
            }
        }

        return data;
    } catch (error) {
        console.error('Error fetching data from Broadcastify:', error.message);
        throw error;
    }
};


builder.defineCatalogHandler(async (args) => {
    try {
        const states = getStates();
        const stateAbbreviations = {
			"Alabama": "AL", 
			"Alaska": "AK", 
			"Arizona": "AZ", 
			"Arkansas": "AR", 
			"California": "CA", 
			"Colorado": "CO", 
			"Connecticut": "CT",
			"Delaware": "DE", 
			"District of Columbia": "DC", 
			"Florida": "FL", 
			"Georgia": "GA", 
			"Hawaii": "HI", 
			"Idaho": "ID",
			"Illinois": "IL", 
			"Indiana": "IN", 
			"Iowa": "IA", 
			"Kansas": "KS", 
			"Kentucky": "KY", 
			"Louisiana": "LA", 
			"Maine": "ME", 
			"Maryland": "MD",
			"Massachusetts": "MA", 
			"Michigan": "MI", 
			"Minnesota": "MN", 
			"Mississippi": "MS", 
			"Missouri": "MO", 
			"Montana": "MT", 
			"Nebraska": "NE",
			"Nevada": "NV", 
			"New Hampshire": "NH", 
			"New Jersey": "NJ", 
			"New Mexico": "NM", 
			"New York": "NY", 
			"North Carolina": "NC",
			"North Dakota": "ND", 
			"Ohio": "OH", 
			"Oklahoma": "OK", 
			"Oregon": "OR", 
			"Pennsylvania": "PA", 
			"Rhode Island": "RI",
			"South Carolina": "SC", 
			"South Dakota": "SD", 
			"Tennessee": "TN", 
			"Texas": "TX", 
			"Utah": "UT", 
			"Vermont": "VT", 
			"Virginia": "VA", 
			"Washington": "WA", 
			"West Virginia": "WV", 
			"Wisconsin": "WI", 
			"Wyoming": "WY"
		};

        const catalogItems = states.map(async state => {
            const abbreviation = stateAbbreviations[state];
            const posterUrl = `https://raw.githubusercontent.com/coryetzkorn/state-svg-defs/5e5141e6117c793abf1892d0e4c8a4ebb76b032a/SVG/${abbreviation}.svg`;

            return {
                id: `broadcastify_states_${state}`,
                type: "radio",
                name: state,
                genres: ["Public Safety"], // Set the genre for all states to "Public Safety"
                poster: posterUrl,
            };
        });

        return { metas: await Promise.all(catalogItems) };
    } catch (error) {
        console.error('Error in defineCatalogHandler:', error.message);
        throw error;
    }
});

builder.defineStreamHandler(async (args) => {
    try {
        const state = args.id.replace('broadcastify_states_', ''); // Extract state from ID
        const stid = replaceSTID(state);
        if (!stid) {
            throw new Error('Invalid state');
        }

        const data = await fetchDataFromBroadcastify(state);

        // Create a stream entry for all feeds in the state
        const streams = [];
        Object.keys(data).forEach(county => {
            data[county].forEach(feed => {
                const streamEntry = {
                    id: `broadcastify_states_${state}_${county}_${feed.feed.replace(/ /g, '_')}`,
                    title: `Listen to ${county} | ${feed.feed} - ${feed.listeners} listeners`,
                    url: feed.links,
                };

                streams.push(streamEntry);
            });
        });

        return { streams };
    } catch (error) {
        console.error('Error in defineStreamHandler:', error.message);
        throw error;
    }
});



module.exports = builder.getInterface();
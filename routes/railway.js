const express = require("express");
const Fuse = require("fuse.js");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* =====================================
 * Load & Normalize Data (ONCE)
 * ===================================== */

// -------- STATIONS --------
const stationsFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/stations.json"), "utf8")
);

const stationsRaw = stationsFile.stations;

if (!Array.isArray(stationsRaw)) {
    throw new Error("stations.json format invalid: expected { stations: [] }");
}

const stations = stationsRaw.map((s) => ({
    code: s.stnCode?.trim().toUpperCase(),
    name: s.stnName?.trim().toUpperCase(),
    city: s.stnCity?.trim().toUpperCase(),
}));

console.log("Stations loaded:", stations.length);

// -------- TRAINS --------
const trainsFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/trains.json"), "utf8")
);

const trainsRaw = trainsFile.trains;

if (!Array.isArray(trainsRaw)) {
    throw new Error("trains.json format invalid: expected { trains: [] }");
}

const trains = trainsRaw.map((t) => ({
    number: t.number.trim(),
    name: t.name.trim().toUpperCase(),
    tokens: t.name
        .toUpperCase()
        .replace(/EXP|EXPRESS|SF|MAIL|SPL/g, "")
        .trim(),
}));

console.log("Trains loaded:", trains.length);

/* =====================================
 * Fuse.js Indexes (Built ONCE)
 * ===================================== */

const stationFuse = new Fuse(stations, {
    keys: [
        { name: "searchText", weight: 0.6 },
        { name: "name", weight: 0.2 },
        { name: "city", weight: 0.2 }
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
});

const trainFuse = new Fuse(trains, {
    keys: [
        { name: "number", weight: 0.6 },
        { name: "tokens", weight: 0.3 },
        { name: "name", weight: 0.1 },
    ],
    threshold: 0.25,
    ignoreLocation: true,
    minMatchCharLength: 2,
});

/* =====================================
 * Validator
 * ===================================== */

function requireQuery(req, res, next) {
    const q = req.query.q?.trim();
    if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    req.q = q.toUpperCase();
    next();
}

/* =====================================
 * Routes
 * ===================================== */

/**
 * GET /search/station?q=coimbatore
 */
router.get("/station", requireQuery, (req, res) => {
    const results = stationFuse.search(req.q, { limit: 5 });

    res.json(
        results.map(({ item }) => ({
            code: item.code,
            name: item.name,
            city: item.city,
        }))
    );
});

/**
 * GET /search/train?q=22666 | uday | cbe sbc
 */
router.get("/train", requireQuery, (req, res) => {
    // Fast path for numeric train search
    if (/^\d{3,5}$/.test(req.q)) {
        const exact = trains
            .filter((t) => t.number.includes(req.q))
            .slice(0, 5);

        if (exact.length) {
            return res.json(
                exact.map((t) => ({
                    number: t.number,
                    name: t.name,
                }))
            );
        }
    }

    const results = trainFuse.search(req.q, { limit: 5 });

    res.json(
        results.map(({ item }) => ({
            number: item.number,
            name: item.name,
        }))
    );
});

module.exports = router;

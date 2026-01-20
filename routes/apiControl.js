const express = require("express");
const Fuse = require("fuse.js");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* =====================================
 * Helpers
 * ===================================== */

function normalize(str = "") {
    return str
        .toUpperCase()
        .replace(/\bBANGALORE\b/g, "BENGALURU")
        .replace(/\bBANGLORE\b/g, "BENGALURU")
        .replace(/\s+/g, " ")
        .trim();
}

function stripVowels(str = "") {
    return str.replace(/[AEIOU]/g, "");
}

/* =====================================
 * Load & Normalize Data (ONCE)
 * ===================================== */

// -------- STATIONS --------
const stationsFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/stations.json"), "utf8")
);

const stationsRaw = stationsFile.stations;
if (!Array.isArray(stationsRaw)) {
    throw new Error("stations.json format invalid");
}

const stations = stationsRaw.map((s) => {
    const name = normalize(s.stnName);
    const city = normalize(s.stnCity);

    return {
        code: s.stnCode.trim().toUpperCase(),
        name,
        city,
        searchText: [
            name,
            city,
            stripVowels(name),
            stripVowels(city),
            s.stnCode
        ].join(" ")
    };
});

console.log("Stations loaded:", stations.length);

// -------- TRAINS --------
const trainsFile = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/trains.json"), "utf8")
);

const trainsRaw = trainsFile.trains;
if (!Array.isArray(trainsRaw)) {
    throw new Error("trains.json format invalid");
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

// -------- BUS CITIES --------
const citiesRaw = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/cities.json"), "utf8")
);

if (!Array.isArray(citiesRaw)) {
    throw new Error("cities.json format invalid");
}

const cities = citiesRaw.map((c) => {
    const name = normalize(c.name);
    const state = normalize(c.state);

    return {
        id: c.id,
        name,
        state,
        searchText: [
            name,
            state,
            stripVowels(name),
            stripVowels(state)
        ].join(" ")
    };
});

console.log("Cities loaded:", cities.length);

/* =====================================
 * Fuse Indexes
 * ===================================== */

const stationFuse = new Fuse(stations, {
    keys: [{ name: "searchText", weight: 1 }],
    threshold: 0.4,
    ignoreLocation: true,
});

const trainFuse = new Fuse(trains, {
    keys: [
        { name: "number", weight: 0.6 },
        { name: "tokens", weight: 0.3 },
        { name: "name", weight: 0.1 },
    ],
    threshold: 0.25,
    ignoreLocation: true,
});

const cityFuse = new Fuse(cities, {
    keys: [{ name: "searchText", weight: 1 }],
    threshold: 0.4,
    ignoreLocation: true,
});

/* =====================================
 * Validator
 * ===================================== */

function requireQuery(req, res, next) {
    const q = req.query.q?.trim();
    if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
    }
    req.q = normalize(q);
    next();
}

/* =====================================
 * Routes
 * ===================================== */

// 🚉 Stations
router.get("/station", requireQuery, (req, res) => {
    const results = stationFuse.search(req.q, { limit: 5 });
    res.json(results.map(({ item }) => ({
        code: item.code,
        name: item.name,
        city: item.city
    })));
});

// 🚆 Trains
router.get("/train", requireQuery, (req, res) => {
    if (/^\d{3,5}$/.test(req.q)) {
        const exact = trains.filter(t => t.number.includes(req.q)).slice(0, 5);
        if (exact.length) return res.json(exact);
    }

    const results = trainFuse.search(req.q, { limit: 5 });
    res.json(results.map(({ item }) => ({
        number: item.number,
        name: item.name
    })));
});

// 🚌 Bus Cities
router.get("/cities", requireQuery, (req, res) => {
    const results = cityFuse.search(req.q, { limit: 5 });
    res.json(results.map(({ item }) => ({
        id: item.id,
        name: item.name,
        state: item.state
    })));
});

module.exports = router;

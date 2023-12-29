#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require("stremio-addon-sdk")
const addonInterface = require("./addon")
serveHTTP(addonInterface, { port: process.env.PORT || 61327 })
# publishToCentral("https://a0da031547f5-stremio-maine-radio.baby-beamup.club/manifest.json")
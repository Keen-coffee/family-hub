"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const settings_js_1 = require("./settings.js");
const router = (0, express_1.Router)();
// GET /api/weather/current
router.get('/current', async (_req, res) => {
    const apiKey = (0, settings_js_1.getSetting)('openweathermap_api_key');
    const lat = (0, settings_js_1.getSetting)('weather_lat');
    const lon = (0, settings_js_1.getSetting)('weather_lon');
    const units = (0, settings_js_1.getSetting)('weather_units') ?? 'imperial';
    if (!apiKey || !lat || !lon) {
        return res.status(503).json({ success: false, error: 'Weather not configured' });
    }
    try {
        const r = await axios_1.default.get('https://api.openweathermap.org/data/2.5/weather', {
            params: { lat, lon, units, appid: apiKey },
        });
        res.json({ success: true, data: r.data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
// GET /api/weather/forecast (5-day / 3-hour)
router.get('/forecast', async (_req, res) => {
    const apiKey = (0, settings_js_1.getSetting)('openweathermap_api_key');
    const lat = (0, settings_js_1.getSetting)('weather_lat');
    const lon = (0, settings_js_1.getSetting)('weather_lon');
    const units = (0, settings_js_1.getSetting)('weather_units') ?? 'imperial';
    if (!apiKey || !lat || !lon) {
        return res.status(503).json({ success: false, error: 'Weather not configured' });
    }
    try {
        const r = await axios_1.default.get('https://api.openweathermap.org/data/2.5/forecast', {
            params: { lat, lon, units, cnt: 40, appid: apiKey },
        });
        res.json({ success: true, data: r.data });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
});
exports.default = router;
//# sourceMappingURL=weather.js.map
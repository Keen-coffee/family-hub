"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_js_1 = require("./db/database.js");
const settings_js_1 = __importDefault(require("./routes/settings.js"));
const dashboard_js_1 = __importDefault(require("./routes/dashboard.js"));
const caldav_js_1 = __importDefault(require("./routes/caldav.js"));
const tandoor_js_1 = __importDefault(require("./routes/tandoor.js"));
const weather_js_1 = __importDefault(require("./routes/weather.js"));
const inventory_js_1 = __importDefault(require("./routes/inventory.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3001;
// Middleware
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
// Initialize DB
(0, database_js_1.initializeDatabase)();
// API routes
app.use('/api/settings', settings_js_1.default);
app.use('/api/dashboard', dashboard_js_1.default);
app.use('/api/caldav', caldav_js_1.default);
app.use('/api/tandoor', tandoor_js_1.default);
app.use('/api/weather', weather_js_1.default);
app.use('/api/inventory', inventory_js_1.default);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve static client files in production
if (process.env.NODE_ENV === 'production') {
    const clientDist = path_1.default.resolve(__dirname, '../../public');
    app.use(express_1.default.static(clientDist));
    app.get('*', (_req, res) => {
        res.sendFile(path_1.default.join(clientDist, 'index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`Family Hub server running on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map
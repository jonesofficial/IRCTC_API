const express = require("express");
const apiControlRouter = require("./routes/apiControl");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================
 * Render / Prod Settings
 * ============================ */
app.set("trust proxy", 1);

/* ============================
 * Middleware
 * ============================ */
app.use(express.json());

/* ============================
 * Routes
 * ============================ */
app.use("/search", apiControlRouter);

/**
 * Health check (USED BY RENDER)
 */
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        memory: process.memoryUsage().rss,
        time: new Date().toISOString(),
    });
});

/* ============================
 * Global Error Handler
 * ============================ */
app.use((err, req, res, next) => {
    console.error("❌ Error:", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});

/* ============================
 * Start Server
 * ============================ */
const server = app.listen(PORT, () => {
    console.log(`🚆 Quickets IRCTC API running on port ${PORT}`);
});

/* ============================
 * Graceful Shutdown (Render)
 * ============================ */
process.on("SIGTERM", () => {
    console.log("🛑 SIGTERM received. Shutting down gracefully...");
    server.close(() => {
        console.log("✅ Server closed.");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    console.log("🛑 SIGINT received. Shutting down...");
    process.exit(0);
});

const express = require("express");
const railwayRouter = require("./routes/railway");

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================
 * Middleware
 * ============================ */
app.use(express.json());

/* ============================
 * Routes
 * ============================ */
app.use("/search", railwayRouter);

app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
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
app.listen(PORT, () => {
    console.log(`🚆 Quickets IRCTC API running on port ${PORT}`);
});

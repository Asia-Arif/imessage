export function getAllowedOrigins() {
    const origins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

    for (const origin of (process.env.FRONTEND_URL || "").split(",")) {
        const trimmed = origin.trim();
        if (trimmed) origins.add(trimmed);
    }

    return [...origins];
}

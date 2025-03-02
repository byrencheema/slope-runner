import { createServer, IncomingMessage, ServerResponse } from 'http';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';

const PORT = 3001;

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    console.log("\n🔵 Received request:", req.method, req.url); // Logs every request

    // **CORS Handling**
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    // **Set CORS Headers for Responses**
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.url === '/api/updateLeaderboard' && req.method === 'POST') {
        console.log("🟢 Handling leaderboard update...");

        try {
            // **Ensure request body is read correctly**
            let body = "";
            req.on("data", chunk => {
                body += chunk;
            });

            req.on("end", async () => {
                console.log("🟢 Received raw body:", body); // Debug: Confirm body data

                // **Parse JSON**
                let parsedBody;
                try {
                    parsedBody = JSON.parse(body);
                } catch (error) {
                    console.error("❌ Invalid JSON received:", error);
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: "Invalid JSON format" }));
                    return;
                }

                // **Extract Name and Score**
                const { name, score } = parsedBody;
                if (!name || typeof name !== "string" || !score || typeof score !== "number") {
                    console.error("❌ Invalid request data:", parsedBody);
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: "Invalid data format. Expected { name: string, score: number }" }));
                    return;
                }

                console.log(`🟢 Adding new score: ${name}, ${score}`);

                // **Leaderboard File Handling**
                const leaderboardPath = resolve(process.cwd(), "./src/leaderboard.txt");
                let existingData = "";

                try {
                    existingData = await readFile(leaderboardPath, "utf8");
                    console.log("📜 Existing leaderboard data:", existingData);
                } catch (error) {
                    console.log("⚠️ Leaderboard file not found, starting fresh.");
                }

                // **Parse & Sort Scores**
                let scores = existingData
                    .trim()
                    .split("\n")
                    .filter(line => line.trim() !== "") // Remove empty lines
                    .map(line => {
                        const [player, score] = line.split(",");
                        return { name: player, score: parseInt(score, 10) || 0 };
                    });

                // **Add New Score & Sort**
                scores.push({ name, score });
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 10); // Keep top 10

                console.log("🏆 Updated leaderboard:", scores);

                // **Write Updated Leaderboard**
                const formattedData = scores.map(entry => `${entry.name},${entry.score}`).join("\n");
                console.log("💾 Writing leaderboard:", formattedData);

                await writeFile(leaderboardPath, formattedData, { encoding: "utf8", flag: "w" });

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    message: "Leaderboard updated successfully",
                    updatedScores: scores,
                }));
            });

        } catch (error) {
            console.error("❌ Error updating leaderboard:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: "Failed to update leaderboard", error: (error as Error).message }));
        }
    } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Not Found" }));
    }
});

// **Start Server**
server.listen(PORT, () => {
    console.log(`🚀 API Server running at http://localhost:${PORT}`);
});

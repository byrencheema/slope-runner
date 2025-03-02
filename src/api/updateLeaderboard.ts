import { IncomingMessage, ServerResponse } from 'http';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    console.log("hit"); // Debug: Confirms the API is hit

    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Method not allowed' }));
        return;
    }

    try {
        // **1️⃣ Read request body properly**
        const body = await new Promise<string>((resolve, reject) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => resolve(data));
            req.on('error', reject);
        });

        console.log("Received body:", body); // Debugging

        // **2️⃣ Parse JSON body & Validate**
        let parsedBody;
        try {
            parsedBody = JSON.parse(body);
        } catch (error) {
            throw new Error('Invalid JSON format in request');
        }

        const { name, score } = parsedBody;
        if (!name || typeof name !== 'string' || !score || typeof score !== 'number') {
            throw new Error('Invalid data format. Expected { name: string, score: number }');
        }

        console.log(`Adding new score: ${name}, ${score}`);

        // **3️⃣ Read existing leaderboard**
        const leaderboardPath = resolve(process.cwd(), './src/leaderboard.txt');
        let existingData = '';
        try {
            existingData = await readFile(leaderboardPath, 'utf8');
        } catch (error) {
            console.log('Leaderboard file not found, starting fresh.');
        }

        // **4️⃣ Parse existing leaderboard into an array**
        let scores = existingData
            .trim()
            .split('\n')
            .filter(line => line.trim() !== '') // Remove empty lines
            .map(line => {
                const [player, score] = line.split(',');
                return { name: player, score: parseInt(score, 10) || 0 };
            });

        // **5️⃣ Add new score to the list**
        scores.push({ name, score });

        // **6️⃣ Sort leaderboard in descending order**
        scores.sort((a, b) => b.score - a.score);

        // **7️⃣ Keep only top 10 scores**
        scores = scores.slice(0, 10);

        console.log("Updated leaderboard:", scores);

        // **8️⃣ Format data for saving**
        const formattedData = scores.map(entry => `${entry.name},${entry.score}`).join('\n');

        console.log("Saving leaderboard:", formattedData); // Debugging

        // **9️⃣ Write updated leaderboard**
        await writeFile(leaderboardPath, formattedData, { encoding: 'utf8', flag: 'w' });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            message: 'Leaderboard updated successfully',
            updatedScores: scores
        }));

    } catch (error: unknown) {
        console.error('Error updating leaderboard:', error);
        
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');

        if (error instanceof Error) {
            res.end(JSON.stringify({ 
                message: 'Failed to update leaderboard',
                error: error.message
            }));
        } else {
            res.end(JSON.stringify({ 
                message: 'Failed to update leaderboard',
                error: 'An unknown error occurred'
            }));
        }
    }
}

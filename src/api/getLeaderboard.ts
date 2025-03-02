import { IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Method not allowed' }));
        return;
    }

    try {
        const leaderboardPath = resolve(process.cwd(), './src/leaderboard.txt');
        const data = await readFile(leaderboardPath, 'utf8');

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(data);
    } catch (error) {
        console.error('Error reading leaderboard:', error);

        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Failed to read leaderboard', error: (error as Error).message }));
    }
}

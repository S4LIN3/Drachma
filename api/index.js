import { handleApiRequest } from '../server/api.js';

export default async function handler(req, res) {
  try {
    await handleApiRequest(req, res);
  } catch (err) {
    console.error('Vercel Serverless Function Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
    }
  }
}

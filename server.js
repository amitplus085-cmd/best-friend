const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Password now comes from an environment variable, NOT from this code.
// Set ADMIN_PASSWORD in Render's dashboard (Settings -> Environment).
// Falls back to 'changeme123' only for local testing on your own computer.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Make sure data.json exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function readEntries() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Could not read data.json:', err);
    return [];
  }
}

function writeEntries(entries) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

// Very simple rate limiter: max 10 submissions per IP every 10 minutes.
// Stops someone from spamming the form hundreds of times in a row.
const submitTimestamps = {};
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 10;

  if (!submitTimestamps[ip]) {
    submitTimestamps[ip] = [];
  }
  submitTimestamps[ip] = submitTimestamps[ip].filter(t => now - t < windowMs);

  if (submitTimestamps[ip].length >= maxRequests) {
    return true;
  }
  submitTimestamps[ip].push(now);
  return false;
}

// Basic cleanup so req.body values are always plain strings, capped in length.
// Stops someone from sending huge junk data or weird objects instead of text.
function sanitizeEntry(rawEntry) {
  const allowedFields = [
    'name', 'dob', 'birthplace', 'color', 'food', 'movie', 'sport',
    'actor', 'actress', 'travel', 'dream', 'hobby', 'email', 'phone'
  ];
  const clean = {};
  allowedFields.forEach(field => {
    let val = rawEntry[field];
    if (typeof val !== 'string') val = '';
    clean[field] = val.slice(0, 300); // cap length so no one can send megabytes of text
  });
  return clean;
}

// Save a new form submission
app.post('/api/submit', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many submissions, try again later.' });
  }

  const entry = sanitizeEntry(req.body || {});
  entry.submittedAt = new Date().toISOString();

  const entries = readEntries();
  entries.push(entry);
  writeEntries(entries);

  res.json({ ok: true });
});

// Return all saved submissions — password protected, only you should know it
app.get('/api/responses', (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.json(readEntries());
});

app.listen(PORT, () => {
  console.log(`Bestie ID site running at http://localhost:${PORT}`);
  console.log(`Responses are saved in ${DATA_FILE}`);
});

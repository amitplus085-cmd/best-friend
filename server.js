const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// CHANGE THIS to your own secret password before sharing the link with anyone
const ADMIN_PASSWORD = 'changeme123';

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

// Save a new form submission
app.post('/api/submit', (req, res) => {
  const entry = req.body || {};
  entry.submittedAt = entry.submittedAt || new Date().toISOString();

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

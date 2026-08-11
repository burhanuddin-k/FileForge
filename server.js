require('dotenv').config();

const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const ROOT = __dirname;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set and should be at least 32 characters long.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fileforge',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const authCookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 7,
  path: '/'
};

function createToken(user) {
  return jwt.sign(
    { sub: String(user.id), name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function getUserFromRequest(req) {
  const token = req.cookies.fileforge_token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: 'Please log in to use FileForge.' });
  req.user = user;
  next();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({ message: 'Please enter a valid name.' });
    }
    if (!validEmail(email) || email.length > 255) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      return res.status(409).json({ message: 'An account with this email already exists. Please log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const user = { id: result.insertId, name, email };
    res.cookie('fileforge_token', createToken(user), authCookieOptions);
    return res.status(201).json({ user });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return res.status(500).json({ message: 'Could not create the account right now.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!validEmail(email) || !password) {
      return res.status(400).json({ message: 'Enter your email and password.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }

    const safeUser = { id: user.id, name: user.name, email: user.email };
    res.cookie('fileforge_token', createToken(safeUser), authCookieOptions);
    return res.json({ user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Could not log in right now.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('fileforge_token', { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'lax', path: '/' });
  res.json({ message: 'Logged out.' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.sub, name: req.user.name, email: req.user.email } });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', service: 'FileForge' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'unavailable', service: 'FileForge' });
  }
});

// Serve only the files the browser needs. The dashboard itself is protected below.
app.get('/style.css', (req, res) => res.sendFile(path.join(ROOT, 'style.css')));
app.get('/app.js', (req, res) => res.sendFile(path.join(ROOT, 'app.js')));
app.get('/auth.js', (req, res) => res.sendFile(path.join(ROOT, 'auth.js')));

app.get('/', (req, res) => {
  if (getUserFromRequest(req)) return res.redirect('/app');
  res.sendFile(path.join(ROOT, 'auth.html'));
});

app.get('/login', (req, res) => {
  if (getUserFromRequest(req)) return res.redirect('/app');
  res.sendFile(path.join(ROOT, 'auth.html'));
});

app.get('/register', (req, res) => {
  if (getUserFromRequest(req)) return res.redirect('/app');
  res.sendFile(path.join(ROOT, 'auth.html'));
});

app.get('/app', requireAuth, (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API route not found.' });
  res.status(404).send('FileForge page not found.');
});

(async () => {
  try {
    await pool.query('SELECT 1');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`FileForge server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
})();

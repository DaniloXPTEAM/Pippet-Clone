// Persistencia local em JSON (data/db.json) + arquivos em data/files. Sem dependencias.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CreditLedger } from '../../src/credits.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.PIPPIT_LOCAL_DATA || path.join(HERE, '..', '..', 'data');
export const FILES_DIR = path.join(DATA_DIR, 'files');
fs.mkdirSync(FILES_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'db.json');
const uid = () => String(Date.now()) + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
export const newId = uid;

const DAY_MS = 86400000;
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 0); return x; };

function fresh() {
  const now = new Date();
  const db = {
    user: { id: uid(), name: 'user' + uid().slice(-10), plan: 'free', billing: 'monthly', createdAt: now.toISOString() },
    settings: { language: 'pt-BR', theme: 'light', creditConfirm: { mode: 'threshold', limit: 450 }, watermark: false },
    ledger: { lots: [], entries: [], lastDailyClaim: null },
    projects: [], assets: [], avatars: { photoFreeUses: 3, photo: [], video: [], voices: [] },
    social: { accounts: {}, limit: 3 }, events: [], shares: {}, notifications: [],
  };
  // observado: bonus de criacao de conta +200 (validade 2 anos)
  const l = new CreditLedger();
  l.grant('Créditos de bônus por criação de conta', 200, now, new Date(now.getTime() + 730 * DAY_MS));
  db.ledger = serializeLedger(l, null);
  return db;
}
export function serializeLedger(l, lastDailyClaim) {
  return { lots: l.lots.map((x) => ({ ...x, expiresAt: x.expiresAt.toISOString() })), entries: l.entries.map((e) => ({ ...e, at: e.at.toISOString() })), lastDailyClaim };
}
export function hydrateLedger(raw) {
  const l = new CreditLedger();
  l.lots = raw.lots.map((x) => ({ ...x, expiresAt: new Date(x.expiresAt) }));
  l.entries = raw.entries.map((e) => ({ ...e, at: new Date(e.at) }));
  return l;
}
let db = null;
export function load() {
  if (db) return db;
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { db = fresh(); save(); }
  return db;
}
export function save() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1)); }
export function reset() { db = fresh(); save(); return db; }
// concessao diaria observada: +80 creditos, validade ate 23:59:59 do mesmo dia (credit_receive)
export function claimDaily(now = new Date()) {
  const d = load(); const day = new Date(now).toDateString();
  if (d.ledger.lastDailyClaim === day) return { claimed: false };
  const l = hydrateLedger(d.ledger);
  l.grant('Créditos gratuitos', 80, now, endOfDay(now));
  d.ledger = serializeLedger(l, day); save(); return { claimed: true, amount: 80 };
}
export function balance(now = new Date()) {
  const d = load(); const l = hydrateLedger(d.ledger); const b = l.balance(now);
  d.ledger = serializeLedger(l, d.ledger.lastDailyClaim); save(); return b;
}
export function balances(now = new Date()) {
  const d = load(); const l = hydrateLedger(d.ledger); const b = l.balances(now);
  d.ledger = serializeLedger(l, d.ledger.lastDailyClaim); save(); return b;
}
export function debit(label, amount, now = new Date()) {
  const d = load(); const l = hydrateLedger(d.ledger); const r = l.debit(label, amount, now);
  d.ledger = serializeLedger(l, d.ledger.lastDailyClaim); save(); return r;
}
export function ledgerView(now = new Date()) {
  const d = load(); const l = hydrateLedger(d.ledger); l.expireUntil(now);
  d.ledger = serializeLedger(l, d.ledger.lastDailyClaim); save();
  const bal = l.balances(now); return { balance: l.lots.reduce((s, x) => s + x.remaining, 0), balances: bal, lots: l.lots.filter((x) => x.remaining > 0).sort((a, b) => a.expiresAt - b.expiresAt).map((x) => ({ label: x.label, pouch: x.pouch || 'gift', remaining: x.remaining, expiresAt: x.expiresAt.toISOString() })), entries: [...l.entries].sort((a, b) => b.at - a.at).map((e) => ({ at: e.at.toISOString(), label: e.label, delta: e.delta, pouch: e.pouch || null, pouches: e.pouches || null })) };
}
export const pubFile = (name) => path.join(FILES_DIR, name);

/**
 * Kullanım: node scripts/reset-unread-for-email.mjs <email>
 * .env.local içinden SUPABASE_SERVICE_ROLE_KEY ve URL okur.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnv() {
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Kullanım: node scripts/reset-unread-for-email.mjs <email>");
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(".env.local içinde URL veya SUPABASE_SERVICE_ROLE_KEY eksik.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listErr) {
  console.error("Kullanıcı listesi:", listErr.message);
  process.exit(1);
}

const user = list.users.find(
  (u) => (u.email ?? "").toLowerCase() === email
);

if (!user) {
  console.error("Bu e-posta ile kullanıcı bulunamadı:", email);
  process.exit(1);
}

const userId = user.id;
console.log("Kullanıcı:", email, "→", userId);

const { data: convs, error: cErr } = await supabase
  .from("conversations")
  .select("id")
  .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

if (cErr) {
  console.error("conversations:", cErr.message);
  process.exit(1);
}

const convIds = (convs ?? []).map((c) => c.id);
if (convIds.length === 0) {
  console.log("Konuşma yok; güncellenecek mesaj yok.");
  process.exit(0);
}

const { data: unreadRows, error: qErr } = await supabase
  .from("messages")
  .select("id")
  .in("conversation_id", convIds)
  .neq("sender_id", userId)
  .or("is_read.is.null,is_read.eq.false");

if (qErr) {
  console.error("messages seçim:", qErr.message);
  process.exit(1);
}

const msgIds = (unreadRows ?? []).map((r) => r.id);
if (msgIds.length === 0) {
  console.log("Okunmamış gelen mesaj yok (zaten sıfır).");
  process.exit(0);
}

const BATCH = 150;
let updated = 0;
for (let i = 0; i < msgIds.length; i += BATCH) {
  const batch = msgIds.slice(i, i + BATCH);
  const { error: uErr } = await supabase
    .from("messages")
    .update({ is_read: true })
    .in("id", batch);
  if (uErr) {
    console.error("messages güncelleme:", uErr.message);
    process.exit(1);
  }
  updated += batch.length;
}

console.log("Okundu yapılan mesaj sayısı:", updated);
console.log("Bitti. Rozet sıfırlanmış olmalı; sayfayı yenile.");

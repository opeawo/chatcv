#!/usr/bin/env node
// Reads json_cv/*.json and produces src/profiles-index.json
// Run: node scripts/build-profiles-index.js

const fs = require("fs");
const path = require("path");

const JSON_CV_DIR = path.join(__dirname, "..", "json_cv");
const OUTPUT = path.join(__dirname, "..", "src", "profiles-index.json");

// Skip demo files — those are hardcoded fallbacks
const SKIP_DEMO = /-demo\.json$/;

// Infer intent/status from summary keywords
function inferStatus(summary, label) {
  const text = `${summary} ${label}`.toLowerCase();
  if (/\b(hiring|looking for .*(engineer|developer|designer|manager|analyst)|building.* team|open role|we.re looking|recruit)\b/.test(text)) return "hiring";
  if (/\b(co-author|collaborat|research|partner|open.source|contributor|seeking.*co-|call for)\b/.test(text)) return "collaborating";
  if (/\b(invest|venture|fund|scout|portfolio|deal.flow|seed|series [a-c]|angel)\b/.test(text)) return "scouting";
  // Default: open_to_work (most common for individual profiles)
  return "open_to_work";
}

function extractProfile(data) {
  const r = data.resume || {};
  const basics = r.basics || {};
  const work0 = r.work?.[0];
  const name = basics.name?.trim();
  if (!name || name.length < 2) return null;

  const label = basics.label || work0?.position || "";
  const company = work0?.name || "";
  const summary = r.about?.summary || "";
  const city = basics.location?.city || "";
  const country = basics.location?.country_code || "";
  const skills = (r.skills || []).map(s => s.name).filter(Boolean).slice(0, 8);
  const slug = data.slug || "";

  // Skip profiles with insufficient data for mesh matching
  if (!label || !company || !summary) return null;

  return {
    s: slug,
    n: name,
    l: label.slice(0, 60),
    c: company.slice(0, 50),
    ci: city,
    co: country,
    su: summary.slice(0, 200),
    sk: skills.slice(0, 5),
    st: inferStatus(summary, label),
  };
}

// ── Main ──
const files = fs.readdirSync(JSON_CV_DIR).filter(f => f.endsWith(".json") && !SKIP_DEMO.test(f));
console.log(`Processing ${files.length} profiles...`);

const profiles = [];
let skipped = 0;

for (const file of files) {
  try {
    const raw = fs.readFileSync(path.join(JSON_CV_DIR, file), "utf-8");
    const data = JSON.parse(raw);
    const profile = extractProfile(data);
    if (profile) profiles.push(profile);
    else skipped++;
  } catch {
    skipped++;
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(profiles, null, 0));
const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2);
console.log(`✓ ${profiles.length} profiles indexed (${skipped} skipped)`);
console.log(`✓ Written to ${OUTPUT} (${sizeMB} MB)`);

// Status distribution
const dist = {};
profiles.forEach(p => { dist[p.st] = (dist[p.st] || 0) + 1; });
console.log("Status distribution:", dist);

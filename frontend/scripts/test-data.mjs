// Quick data-layer sanity check (reads the same CSV the browser fetches).
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Papa = require("papaparse");

const text = fs.readFileSync(new URL("../public/data/composite_index.csv", import.meta.url), "utf8");
const { data } = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });

const LABEL_TO_KEY = {
  "Student / Fresher": "student_fresher",
  "Junior IT Professional": "junior_it",
  "Senior IT Professional": "senior_it",
  "Family with Kids": "family_kids",
  "Remote Worker": "remote_worker",
};
const rows = data.filter((r) => r.locality).map((r) => ({ ...r, persona: LABEL_TO_KEY[r.persona] }));

function getPersonaTopN(persona, season, n) {
  return rows
    .filter((r) => r.persona === persona && r.season === season)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, n);
}

console.log("total rows:", rows.length);
console.log('getPersonaTopN("student_fresher","Monsoon",5):');
for (const r of getPersonaTopN("student_fresher", "Monsoon", 5)) {
  console.log(`  #${r.rank}  ${r.locality.padEnd(16)} index ${r.composite_index}  (${r.verdict})`);
}

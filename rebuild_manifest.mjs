// Rebuilds audio/manifest.json from the .wav files that exist, using the text in lines.json.
// Use it if generate_voice.py was stopped part-way (it only writes the manifest at the end).
// Run:  node rebuild_manifest.mjs
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('lines.json', 'utf8'));
const manifest = {};
for (const line of config.lines) {
  const ids = line.per_elder
    ? Object.entries(config.elders).map(([slug, name]) => [`${line.id}_${slug}`, line.text.replace('{name}', name)])
    : [[line.id, line.text]];
  for (const [id, text] of ids) {
    if (fs.existsSync(`audio/${id}.wav`)) manifest[id] = { file: `audio/${id}.wav`, text, when: line.when || '' };
  }
}
fs.writeFileSync('audio/manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
console.log(`manifest: ${Object.keys(manifest).length} clips`);

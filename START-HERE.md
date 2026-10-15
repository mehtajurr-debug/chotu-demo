# How to build Chotu with Claude Code

1. Open a terminal in this folder (chotu-demo). In File Explorer: click the address bar, type `cmd`, press Enter.
2. Type `claude` and press Enter.
3. Paste the prompt below. Claude Code reads CLAUDE.md by itself.

## First prompt (paste this)
Read CLAUDE.md and open reference/prototype.html. Do Stage 1 only: set up React + Vite, two phone frames side by side, shared state, demo clock, and seed data using the images in the Assets folder. Match the look of the prototype exactly. Tell me in plain language what you are doing, give me the exact command to run it, and stop so I can look before Stage 2. Before writing medicines.json, show me a table of the medicine names you read from the packet photos and wait for my corrections.

## After each stage
Say "looks good, commit and go to Stage N" or tell it what to change.

## Voice (later)
Create a file named `.env` containing `GEMINI_API_KEY=your key` (never paste the key in chat). Then ask Claude Code: "Run generate_voice.py and wire the clips into the elder screen."

# Star Sprint — a little worlds game for start.ng

A small Three.js game: bring your start.ng character to a floating island, customize their look for this device, and collect eight stars as quickly as you can. Signed-in best times go to the shared start.ng leaderboard.

## Play on your computer

1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Open PowerShell in the folder that contains `index.html` and `game.js`.
3. Run `npx serve .`.
4. Open the local web address printed in PowerShell (often `http://localhost:3000`).
5. Press **Start playing**. Move with **W A S D** or the arrow keys; on a phone, use the touch arrows.

The game uses Three.js from jsDelivr. That CDN is allowed by start.ng and needs an internet connection. On your computer, the game is in **local preview** mode: start.ng character sign-in and shared scores work after the game is published at its `*.start.ng` address.

## What start.ng provides

The game uses the documented hidden `https://start.ng/connect` page. It verifies replies by checking both the message origin and the iframe that sent it. It reads the player's name and character style (body, colors, hair, hat, accessory), provides the standard guest character, and can save a signed-in player's fastest time. The browser never sees passwords or API keys. Character edits are saved locally per start.ng player ID; the shared leaderboard is saved by start.ng.

`startng.json` declares one leaderboard column: the fastest time, with lower times ranked first.

## Publish the game

start.ng hosts games from a **public GitHub repository**. It serves a ready-to-play `index.html` and the other static files; there is no `npm install` or build step. Keep `index.html`, `game.js`, `startng.json`, and `cover.png` together at the repository root.

Beginner steps:

1. Create or sign in to a GitHub account at [github.com](https://github.com/).
2. Create a **public** repository named `star-sprint`.
3. Upload the four files above to the repository root and commit the change.
4. In PowerShell, replace `YOUR-NAME` in the command below with your GitHub username, then run it. It checks the files without publishing:

   ```powershell
   $body = '{"repo_url":"https://github.com/YOUR-NAME/star-sprint","name":"star-sprint"}'
   Invoke-RestMethod -Method Post -Uri 'https://api.start.ng/games/check' -ContentType 'application/json' -Body $body
   ```

   A successful check returns `ok: true`; fix errors before you publish. Warnings (such as optional cleanup) do not block publishing.
5. When the check passes, publish with the same request body:

   ```powershell
   Invoke-RestMethod -Method Post -Uri 'https://api.start.ng/games/publish' -ContentType 'application/json' -Body $body
   ```

6. For the first publish, start.ng returns an `approve_url`. Open that link and approve putting the game live on your start.ng account. The game address will be `https://star-sprint.start.ng`.
7. Later, pushing changes to the same GitHub branch updates the live game automatically.

The exact API steps and rules are in [start.ng's game guide](https://start.ng/docs.md). The approval link signs you in and asks you to approve the first public release; keep it private and open it yourself.

## Files

- `index.html` — the page layout and Three.js import map.
- `game.js` — the island, character, controls, start.ng connect messages, and leaderboard.
- `startng.json` — fastest-time leaderboard setup.
- `cover.png` — the game's 16:10 card image.

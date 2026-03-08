# Shadow Mode Trainer

AI trading coach for Binance built with OpenClaw. Runs parallel "shadow" simulations of smarter strategies on your real trades (Spot + Futures), compares real vs shadow performance, gives anti-emotional lessons (FOMO, panic sells, over-leverage), weekly reports, what-if scenarios, risk alerts, and secure API key management — all completely risk-free.

Made for #BuildWithBinance contest.

**Install**  
Paste to your OpenClaw bot chat:

Install skill from GitHub: https://github.com/acevod/Shadow-Binance-Bot
Clone to skills folder, load SKILL.md, activate as ShadowModeTrainer.

**Requirements**  
- Binance read-only API Key & Secret (add to .env: BINANCE_API_KEY, BINANCE_SECRET)  
- OpenClaw gateway running  
- Free AI model (Gemini 1.5 Flash / Kimi)

**Triggers & Commands**  
run shadow analysis / what if [symbol/scenario] / weekly report / change binance api key / show binance key status  
Commands: /shadow /spot /futures /report /keystatus /changekey

---
name: shadowbinancebot
description: Shadow Binance Bot - An AI trading coach for Binance that runs parallel "shadow" simulations of optimized strategies on your real trades (Spot + Futures). Fetches read-only portfolio and history data, compares real vs shadow performance, provides personalized lessons to reduce emotional decisions, weekly reports, what-if scenarios, risk alerts, and API key management commands — completely risk-free for education and skill improvement.
metadata:
  openclaw:
    emoji: "🧠📈⚡"
    requires:
      bins: ["node", "curl", "bash"]
      os: ["linux"]
      env: ["BINANCE_API_KEY", "BINANCE_SECRET"]
    user-invocable: true
    version: "1.2.0"
    contest: "#BuildWithBinance 2026"
  author: "acevod"
---

# Shadow Binance Bot

## Overview
Shadow Binance Bot transforms your OpenClaw agent into a personal Binance trading coach. It securely fetches your real portfolio and trade history (Spot + Futures, read-only access only), runs parallel "shadow" simulations using improved strategies, compares performance side-by-side, and delivers actionable insights, lessons, suggestions, weekly reports, what-if analysis, risk alerts, and secure API key management — with zero real money risk.

Main goals:
- Identify better entry/exit timing, DCA opportunities, hold logic, and safer leverage usage.
- Reduce emotional trading (FOMO, panic sells, over-leveraging in Futures).
- Promote responsible trading aligned with Binance's ecosystem and user experience goals.

Supports:
- Spot trading
- USDT-Margined perpetual Futures
- COIN-Margined Futures

## Requirements
- Binance read-only API Key & Secret
  - Create in: Binance → Profile → API Management → Create API → System generated
  - Enable: Read Only (Read Info) + Enable Futures if using Futures
  - NEVER enable Trade or Withdraw permissions!
- Required environment variables (skill will not load without them):
  - BINANCE_API_KEY = your read-only API key
  - BINANCE_SECRET = your API secret
- AI Model: Free-tier models (Gemini 1.5 Flash, Kimi, OpenRouter free tier recommended)
- Dependencies: None additional — uses OpenClaw's built-in HTTP tools

### How to Set Up / Change / Reset API Keys
1. Via .env file (most recommended & secure)
   cd \~/.openclaw
   nano .env
   Add or edit:
   BINANCE_API_KEY=your_api_key_here
   BINANCE_SECRET=your_secret_here
   Save → Restart OpenClaw: openclaw restart

2. Via chat commands (handled by this skill)
   Use the trigger phrases below — the agent will guide you securely step-by-step without ever displaying the full key/secret values.

3. Via openclaw.json (advanced)
   Edit \~/.openclaw/openclaw.json and add/update under skills.entries:
   "shadowmodetrainer": {
     "enabled": true,
     "env": {
       "BINANCE_API_KEY": "your_key_here",
       "BINANCE_SECRET": "your_secret_here"
     }
   }
   Restart OpenClaw.

## Binance API Endpoints
Base URLs:
- Spot: https://api.binance.com
- USDT-M Futures: https://fapi.binance.com
- COIN-M Futures: https://dapi.binance.com

Spot
- GET /api/v3/account → account balances
- GET /api/v3/myTrades → trade history (params: symbol, limit, startTime/endTime)
- GET /api/v3/klines → candlestick data

USDT-M Futures (v3 preferred)
- GET /fapi/v3/balance → wallet balances & unrealized PnL
- GET /fapi/v3/positionRisk → positions, leverage, liquidation price, margin ratio
- GET /fapi/v1/userTrades → trade history
- GET /fapi/v1/klines → candlestick data

COIN-M Futures (v1)
- GET /dapi/v1/account → account balance & positions
- GET /dapi/v1/positionRisk → position risk details
- GET /dapi/v1/userTrades → trade history
- GET /dapi/v1/klines → candlestick data

Signed requests require timestamp + HMAC SHA256 signature.  
Rate limits: Spot \~1200 weight/min, Futures \~2400 weight/min.

## Workflow
1. Detect Spot or Futures mode from command or symbol.
2. Fetch real data using the active BINANCE_API_KEY and BINANCE_SECRET.
3. Calculate real P/L (realized + unrealized in Futures, including funding fees).
4. Run shadow simulation:
   - Spot: DCA on dips >5%, hold on positive trends, avoid panic sells.
   - Futures: Cap leverage (max 5x suggested), avoid positions near liquidation, suggest hedging.
5. Generate side-by-side comparison table in Markdown.
6. Provide personalized lessons and insights.
7. Output rich response with suggestions.
8. Handle API key management commands when triggered.
9. Schedule weekly report (auto-send every Sunday via Telegram).

## API Key Management Features
The agent supports secure key handling via chat:

- Change key → "change binance api key" / "update binance key"  
  → Bot asks for new key and secret one-by-one, saves securely to .env or config, confirms without showing values.
- Check status → "show binance api key status" / "active binance key" / "keystatus"  
  → Responds "Binance API key is active and configured" or "No key set – please add via .env or command".
- Reset key → "reset binance api key"  
  → Clears Binance env vars, then prompts for new key/secret.

Security rule: Never display full key/secret values in any response. Use masked confirmation (e.g., "Key updated – starts with xxxx").

## Telegram UX Enhancements
Commands
- /start — Welcome + mode selector
- /shadow — Run full analysis
- /spot — Force Spot mode
- /futures — Force Futures mode
- /whatif <symbol> <scenario> — e.g., /whatif BTCUSDT "hold from Jan 2026"
- /report — Latest weekly report
- /keystatus — Check Binance key status
- /changekey — Start API key change wizard
- /resetkey — Reset Binance key
- /help — Usage guide

Reply Keyboard (persistent buttons)
- "Run Shadow Analysis 📈"
- "What-If Simulation 🔮"
- "Weekly Report 📅"
- "Switch Spot/Futures 🔄"
- "Key Status 🔑"
- "Change API Key 🔄"
- "Help ❓"

Inline Buttons
- "Run Shadow Demo?" (callback: shadow_demo)
- "More Details" (callback: details)
- "View GitHub Repo" (url: your-repo-link)
- "Confirm Key Update?" / "Cancel" (for key change flow)

Use Markdown/HTML for tables, bold, emojis.

## Trigger Phrases
- run shadow analysis
- shadow mode on/off
- compare my trades/portfolio
- what if [symbol/scenario]
- futures analysis
- spot shadow
- weekly trading report
- improve my binance trades
- change binance api key
- update binance key
- show active binance key
- binance key status
- reset binance api key
- keystatus

## Notes & Safety
- Security: Read-only API only. Add IP restriction in Binance (allow only your VPS IP).
- Futures Risk: High leverage can lead to liquidation. This is simulation only — not financial advice.
- Error Handling: Invalid key, rate limits, no data → friendly messages.
- Privacy: No permanent storage of sensitive data.
- Never expose real API keys in chat, logs, or GitHub.
- Contest: Built for #BuildWithBinance — open-source.

Enhance the Binance ecosystem with responsible AI coaching.

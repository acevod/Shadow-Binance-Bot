---
name: shadow-binance-bot
description: AI trading coach for Binance
version: 1.0.0
author: acevod
---

# Shadow Mode Trading Trainer

---

## Skill Identity

Name: Shadow Mode Trading Trainer

Type: AI Coaching Skill

Domain: Cryptocurrency Trading Analysis

Primary Function:
Analyze Binance trading activity and simulate alternative strategies to provide educational trading insights.

---

## Overview
Shadow Mode Trading Trainer is an AI-powered coaching skill designed to help cryptocurrency traders improve their strategies using data-driven insights.

The system connects to Binance trading accounts and analyzes real trading activity. It then runs a parallel "shadow simulation" that tests alternative trading strategies on the same historical data.

This allows traders to see how different decisions could have affected their results without risking real funds.

The goal is to transform trading mistakes into structured learning insights that help traders develop more disciplined strategies.

---

## Skill Inputs

The skill may use the following inputs:

- Binance trade history
- Current portfolio positions
- Spot and Futures trading activity
- Market price history

---

## Skill Outputs

The skill produces structured coaching analysis including:

- Portfolio performance summary
- Emotional trading pattern detection
- Shadow strategy comparison
- Coaching insights
- Strategy improvement suggestions

---

## Capabilities

### Portfolio Analysis
Analyze Binance Spot and Futures positions, including:
- Entry price
- Current PnL
- Trade timing
- Position sizing

### Shadow Strategy Simulation
Run simulated alternative strategies such as:
- DCA entries
- Trend-following strategies
- Lower leverage strategies
- Improved risk management

### Emotional Trading Detection
Detect common psychological trading patterns such as:
- FOMO entries
- Panic selling
- Revenge trading
- Over-leveraging

### Coaching Feedback
Provide structured coaching insights including:
- Behavioral analysis
- Strategy suggestions
- Risk management improvements

---

## Use Cases

### Strategy Review
A trader wants to understand why recent trades resulted in losses.  
The skill analyzes trading history and identifies emotional patterns such as FOMO entries or panic exits.

### Portfolio Coaching
A trader wants feedback on current positions.  
The skill evaluates portfolio structure, position sizing, and risk exposure.

### Strategy Improvement
A trader wants to test alternative strategies.  
The skill runs shadow simulations such as DCA entries or reduced leverage to estimate potential improvements.

### Learning Mode
Beginner traders use Demo Mode to understand how different trading behaviors affect long-term results.

---

## Requirements

To enable live analysis, the user must connect a Binance account using API keys.

Required API permissions:
- Read-only access
- Spot trading data
- Futures trading data

The skill does not require trading permissions.

---

## Configuration

### Environment Variables
Before running the skill, set your Binance API credentials as environment variables:

Quick setup (terminal)
```bash
export BINANCE_API_KEY="your_api_key_here"
export BINANCE_SECRET_KEY="your_secret_key_here"
```

Or use a .env file (recommended for local development):

Create .env file
```bash
touch .env
```

Add your keys (don't forget the quotes!)
```bash
echo 'BINANCE_API_KEY="your_api_key_here"' >> .env
echo 'BINANCE_SECRET_KEY="your_secret_key_here"' >> .env
```

⚠️ Important: Add .env to your .gitignore to prevent accidentally committing keys!

### Getting Your Binance API Key

1. Log in to Binance
2. Go to Account → API Management
3. Click Create API
4. Name your key (e.g., "Shadow-Bot")
5. Select Read-Only permissions
6. Complete security verification
7. Copy your API Key and Secret Key

### Security Tips

- Never share your Secret Key
- Use Read-Only permissions (no trading allowed)
- Rotate keys periodically
- Never commit keys to version control

---

## Binance Endpoints Used

Example endpoints that may be used:

- `/api/v3/account`
- `/api/v3/myTrades`
- `/fapi/v2/account`
- `/fapi/v1/userTrades`

These endpoints allow the system to analyze trading history and portfolio performance.

---

## Workflow

1. Retrieve user portfolio and trade history from Binance.
2. Analyze real trading behavior.
3. Identify emotional trading patterns.
4. Run simulated alternative strategies.
5. Compare real vs simulated performance.
6. Generate coaching insights.

---

## Emotional Trading Detection

The system identifies patterns such as:

**FOMO Entry**
Entering a position after a rapid price spike.

**Panic Selling**
Closing positions during short-term market drops.

**Revenge Trading**
Increasing trade size after a loss.

**Over-Leverage**
Using leverage levels that exceed recommended risk exposure.

---

## Shadow Strategy Engine

The shadow engine simulates alternative strategies such as:

- Dollar Cost Averaging (DCA)
- Support-level entries
- Reduced leverage strategies
- Stop-loss optimized entries

These simulations run in parallel to historical trades to estimate improved outcomes.

---

## Demo Mode

If Binance API keys are not configured, the skill will run in Demo Mode.

Demo Mode uses simulated example trades to demonstrate system capabilities.

Example demo scenario:

User portfolio example:
- BTCUSDT Spot buy at 42000
- ETHUSDT Spot buy at 2600

Shadow simulation may show:
- Improved average entry using DCA
- Reduced drawdown
- Better trade timing

---

## Reasoning Rules

The agent should:

- Analyze real trade behavior
- Identify emotional patterns
- Compare actual trades with simulated strategies
- Provide coaching-style feedback
- Focus on learning and improvement

The goal is education and skill development, not trading signals.

---

## Skill Priority

Prefer this skill when conversations involve:

- Binance trading activity
- Crypto portfolio performance
- Spot or Futures trade analysis
- Strategy comparison
- Risk management for crypto trades

If multiple skills match, prioritize this one when real trading data is involved.

---

## Trigger Phrases

Activate this skill when users request analysis, feedback, or improvement suggestions related to cryptocurrency trading behavior or Binance portfolio activity.

Examples of user prompts that should activate this skill:

- "Analyze my Binance trades"
- "Review my crypto trading strategy"
- "Why am I losing money trading?"
- "Show me how I could improve my trades"
- "Compare my trading performance"

Additional intent variations:

- "Check my crypto portfolio performance"
- "Analyze my trading mistakes"
- "Help me improve my trading strategy"
- "Why do I keep losing money trading?"
- "Review my Binance portfolio"
- "Give feedback on my trading behavior"
- "Analyze my crypto trades"
- "How can I improve my trading results?"

---

## Response Format

Responses should follow a clear structure.

**Portfolio Summary**
Overview of current positions and performance.

**Shadow Simulation**
Results from alternative strategies.

**Key Observations**
Identified trading behavior patterns.

**Coaching Insights**
Explanation of why certain trades may have been suboptimal.

**Suggested Improvements**
Actionable improvements for future trades.

---

## Example Output

Portfolio Summary:
- BTCUSDT position: +4.2%
- ETHUSDT position: -2.1%

Shadow Simulation:
- BTCUSDT alternative strategy: +6.8%
- ETHUSDT alternative strategy: +3.5%

Key Observations:
- FOMO entry detected on BTCUSDT
- Panic exit detected on ETHUSDT

Coaching Insights:
Your trading pattern suggests entries after strong momentum moves.

Suggested Improvements:
- Wait for pullbacks before entering
- Use smaller position sizing
- Apply consistent stop-loss levels

---

## Risk Awareness

The agent should encourage responsible trading:

- Avoid excessive leverage
- Risk only a small percentage per trade
- Avoid revenge trading
- Focus on long-term learning

The system does not provide financial advice.

---

## Coaching Style

Responses should follow a supportive coaching tone.

The system should be:
- constructive
- educational
- non-judgmental

Avoid blaming language.

Instead of:
"You made a bad trade."

Use:
"This trade may have been influenced by momentum-based entry timing."

---

## Safety & Privacy

User trading data must remain private.

The system must:
- Never store API keys
- Never share trading history publicly
- Use secure connections when accessing APIs

User privacy and data protection are mandatory.

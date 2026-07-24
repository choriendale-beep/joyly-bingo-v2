# Lucky Bingo Telegram Bot

A Telegram-only bingo game bot with Supabase-backed wallet tracking and real-time multiplayer rounds.

## Prerequisites

- Node.js 20+
- A [Telegram bot token](https://core.telegram.org/bots#botfather)
- A [Supabase](https://supabase.com) project

## Setup

1. **Apply the database schema**

   Open the Supabase SQL editor and run the full contents of [`src/supabase/schema.sql`](src/supabase/schema.sql).

2. **Enable Realtime**

   In Supabase Dashboard → Database → Replication, enable Realtime for:
   - `transactions`
   - `game_sessions`

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in:

   | Variable | Description |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
   | `SIGNUP_BONUS_AMOUNT` | Bonus on first registration (default 10) |
   | `STAKE_PER_CARTEL` | Birr per cartel per round (default 10) |
   | `LOBBY_SECONDS` | Lobby countdown (default 35) |
   | `CALL_INTERVAL_MS` | Ms between number calls (default 4000) |

4. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

## Bot commands and menu

| Action | Description |
|---|---|
| `/start` | Register with phone contact, receive signup bonus |
| 🎮 Play | Join lobby, select up to 5 cartels, play live round |
| Balance 💰 | Show current wallet balance |
| Deposit 💰 | Request a deposit (pending admin approval) |
| Withdraw 💸 | Request a withdrawal |
| Invite 🔗 | Get referral link |
| Contact Support / Instruction | Help text |

## Production

The bot uses long polling by default (`bot.launch()`). For production at scale, configure a webhook pointing to your server instead.

## Project structure

```
src/
  index.ts          Entry point
  config.ts         Environment config
  bot/              Telegraf handlers and keyboards
  game/             Bingo engine, cartels, rendering
  supabase/         DB client, players, finance, realtime
  lib/              Pure bingo utilities
```

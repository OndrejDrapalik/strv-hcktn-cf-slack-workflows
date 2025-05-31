# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Slack bot application built to run on Cloudflare Workers. The bot responds to mentions, slash commands, button interactions, and messages containing "Hello".

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start local development server on port 9999
pnpm run dev

# Deploy to Cloudflare Workers
pnpm run deploy

# Run tests (currently no tests implemented)
pnpm test

# Start development with Cloudflared tunnel (for Slack webhook testing)
pnpm run dev:proxy
```

## Architecture

The project has two implementation patterns:

1. **Monolithic approach** (`src/index.ts`) - All handlers defined inline
2. **Modular approach** (`src/structured.ts` + `src/handlers.ts`) - Separated handler functions

Both follow Slack's ack/lazy pattern:
- **ack handlers**: Must respond within 3 seconds
- **lazy handlers**: For time-consuming operations

## Key Files

- `wrangler.jsonc` - Cloudflare Workers configuration
- `app-manifest.yml` - Slack app manifest
- `.dev.vars.example` - Environment variables template (copy to `.dev.vars`)

## Required Environment Variables

- `SLACK_BOT_TOKEN` - Bot User OAuth Token
- `SLACK_SIGNING_SECRET` - App signing secret

## Event Handlers

The app handles:
- `app_mention` - When the bot is mentioned
- `message` - Messages containing "Hello"
- `/hello-cf-workers` - Slash command
- Button clicks and modal interactions
- Shortcuts (global and message shortcuts)

## Deployment Notes

- Uses Cloudflare Workers' edge runtime
- No build step required (Wrangler handles bundling)
- Event endpoint: `https://mindzero.dev/slack/events`
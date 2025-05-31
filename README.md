# strv-hcktn-cf-slack-workflows

A Slack bot application built to run on Cloudflare Workers. The bot responds to mentions, slash commands, button interactions, and messages containing "Hello".

This is a fork of [OndrejDrapalik/strv-hcktn-cf-slack-workflows](https://github.com/OndrejDrapalik/strv-hcktn-cf-slack-workflows).

## TODO

- [ ] Make the bot AI-agentic using Vercel AI SDK
- [ ] Persist data in a database (PostgreSQL with Drizzle ORM)
- [ ] Connect to n8n for no-code workflow editing

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd strv-hcktn-cf-slack-workflows
```

### 2. Install Dependencies

This project uses pnpm for package management:

```bash
pnpm install
```

### 3. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Choose "From an app manifest"
3. Select your workspace
4. Copy the contents of `app-manifest.yml` from this repository and paste it into the manifest editor
5. Review and create the app
6. Install the app to your workspace when prompted

### 4. Configure Environment Variables

Copy the example environment variables file:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your Slack app credentials:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
```

You can find these values in your Slack app settings:
- **Bot User OAuth Token**: OAuth & Permissions → Bot User OAuth Token
- **Signing Secret**: Basic Information → Signing Secret

### 5. Set Up Local Development

Slack requires HTTPS endpoints for webhooks. For local development, you'll need a tunnel service.

#### Using Cloudflared (Recommended)

The project includes a built-in command for Cloudflared tunnel:

```bash
pnpm run dev:proxy
```

This will start the development server on port 9999 and create a secure tunnel.

#### Alternative: Using ngrok

If you prefer ngrok or other tunneling services:

```bash
# Start the development server
pnpm run dev

# In another terminal, create a tunnel
ngrok http 9999
```

### 6. Update Slack App Settings

1. Copy the HTTPS URL from your tunnel service
2. In your Slack app settings, go to:
   - **Event Subscriptions**: Enable and set Request URL to `https://your-tunnel-url/slack/events`
   - **Interactivity & Shortcuts**: Enable and set Request URL to `https://your-tunnel-url/slack/events`
   - **Slash Commands**: Update the `/hello-cf-workers` command URL to `https://your-tunnel-url/slack/events`

### 7. Test Your Bot

- Mention your bot in any channel: `@your-bot-name hello`
- Send a message containing "Hello" in a channel where the bot is present
- Use the slash command: `/hello-cf-workers`
- Click the interactive buttons that appear

## Development Commands

```bash
# Start local development server
pnpm run dev

# Start development with Cloudflared tunnel
pnpm run dev:proxy

# Deploy to Cloudflare Workers
pnpm run deploy

# Run tests
pnpm test
```

## Project Structure

- `src/index.ts` - Monolithic approach with all handlers inline
- `src/structured.ts` - Modular approach with separated concerns
- `src/handlers.ts` - Handler functions for the modular approach
- `wrangler.jsonc` - Cloudflare Workers configuration
- `app-manifest.yml` - Slack app manifest template

## Deployment

To deploy to Cloudflare Workers:

1. Configure your Cloudflare account in Wrangler
2. Update `wrangler.jsonc` with your worker name and route
3. Run `pnpm run deploy`

## Troubleshooting

- **Bot not responding**: Check that your bot is invited to the channel
- **Webhook errors**: Ensure your tunnel is running and the URLs in Slack match
- **Authentication errors**: Verify your environment variables are set correctly

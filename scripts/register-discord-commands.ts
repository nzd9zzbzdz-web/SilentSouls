/**
 * Register the bot's slash commands with Discord, guild-scoped: guild commands
 * appear instantly in the dev server, where global commands take up to an
 * hour. Re-run after any change to src/lib/discord/commands.ts; the PUT
 * replaces the guild's whole command set, so removals deploy too.
 *
 * Needs in .env.local (all from the Discord Developer Portal):
 *   DISCORD_APPLICATION_ID  the app's id
 *   DISCORD_BOT_TOKEN       Bot → Token (used only by this script, never the site)
 *   DISCORD_GUILD_ID        the development server's id
 *
 * Run: npm run register-discord
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { DISCORD_COMMANDS } from "../src/lib/discord/commands";

const APP_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APP_ID || !BOT_TOKEN || !GUILD_ID) {
  console.error(
    "Set DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN and DISCORD_GUILD_ID in .env.local first.",
  );
  process.exit(1);
}

const res = await fetch(
  `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DISCORD_COMMANDS),
  },
);

if (!res.ok) {
  console.error(`Discord rejected the commands: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const commands = (await res.json()) as { name: string }[];
console.log(
  `Registered ${commands.length} command(s) in guild ${GUILD_ID}: ` +
    commands.map((c) => `/${c.name}`).join(", "),
);

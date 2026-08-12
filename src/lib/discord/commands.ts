/**
 * Slash-command definitions, shared by scripts/register-discord-commands.ts
 * and the interactions handler so the registered set and the handled set can
 * never drift. Pure data on purpose: the register script runs under plain tsx
 * outside Next, so this module must import nothing.
 *
 * Wire values from Discord's application-commands docs: command type 1 is
 * CHAT_INPUT (a slash command), option type 3 is STRING.
 */
export const DISCORD_COMMANDS = [
  {
    type: 1,
    name: "ping",
    description: "Check that the club systems are online",
  },
  {
    type: 1,
    name: "mystats",
    description: "Your club record (or look up a member by road name)",
    options: [
      {
        type: 3,
        name: "member",
        description: "Road name to look up; leave empty for your own record",
        required: false,
      },
    ],
  },
  {
    type: 1,
    name: "link",
    description: "Link this Discord account to your portal account",
    options: [
      {
        type: 3,
        name: "code",
        description: "Link code from the portal dashboard",
        required: true,
      },
    ],
  },
  {
    type: 1,
    name: "unlink",
    description: "Unlink this Discord account from the portal",
  },
];

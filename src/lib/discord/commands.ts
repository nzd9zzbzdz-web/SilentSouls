/**
 * Slash-command definitions, shared by scripts/register-discord-commands.ts
 * and the interactions handler so the registered set and the handled set can
 * never drift. Pure data on purpose: the register script runs under plain tsx
 * outside Next, so this module must import nothing.
 *
 * Wire values from Discord's application-commands docs: command type 1 is
 * CHAT_INPUT (a slash command), option type 3 is STRING, type 7 is CHANNEL.
 *
 * The `club` option repeats on the member-facing commands because ONE SERVER
 * CAN HOST SEVERAL CLUBS. It is always optional and almost never typed: the
 * bot resolves the club from the caller's own membership, and only asks when
 * somebody genuinely rides with two clubs in the same server.
 */
const CLUB_OPTION = {
  type: 3,
  name: "club",
  description: "Which club (only needed if you ride with more than one here)",
  required: false,
  autocomplete: true,
};
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
      CLUB_OPTION,
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
  {
    type: 1,
    name: "ticket",
    description: "File an activity ticket for officer review",
    options: [
      {
        type: 3,
        name: "type",
        description: "Activity type",
        required: true,
        autocomplete: true,
      },
      CLUB_OPTION,
    ],
  },
  {
    type: 1,
    name: "leaderboard",
    description: "Standings for a stat category",
    options: [
      {
        type: 3,
        name: "category",
        description: "Which board (defaults to the first)",
        required: false,
        autocomplete: true,
      },
      {
        type: 3,
        name: "scope",
        description: "Your club's boards, or every club in the network",
        required: false,
        choices: [
          { name: "club", value: "club" },
          { name: "global", value: "global" },
        ],
      },
      CLUB_OPTION,
    ],
  },
  {
    type: 1,
    name: "bank",
    description: "The club bank: balance, recent ledger, and dues status",
    options: [CLUB_OPTION],
  },
  {
    type: 1,
    name: "dues",
    description: "Pay your club dues (goes to the Treasurer for approval)",
    options: [
      {
        type: 4, // integer
        name: "amount",
        description: "Whole dollars",
        required: true,
        min_value: 1,
        // Mirrors MAX_TREASURY_AMOUNT (this module imports nothing).
        max_value: 1000000000,
      },
      {
        type: 3,
        name: "note",
        description: "Anything the Treasurer should know",
        required: false,
        max_length: 300,
      },
      CLUB_OPTION,
    ],
  },
  {
    type: 1,
    name: "deposit",
    description: "Log money going INTO the club bank",
    options: [
      {
        type: 4,
        name: "amount",
        description: "Whole dollars",
        required: true,
        min_value: 1,
        max_value: 1000000000,
      },
      {
        type: 3,
        name: "note",
        description: "Where the money came from",
        required: true,
        max_length: 300,
      },
      CLUB_OPTION,
    ],
  },
  {
    type: 1,
    name: "withdraw",
    description: "Request money OUT of the club bank",
    options: [
      {
        type: 4,
        name: "amount",
        description: "Whole dollars",
        required: true,
        min_value: 1,
        max_value: 1000000000,
      },
      {
        type: 3,
        name: "note",
        description: "What the money is for",
        required: true,
        max_length: 300,
      },
      CLUB_OPTION,
    ],
  },
  {
    type: 1,
    name: "panel",
    description: "Post the club's Activity Logger card in this channel (admins)",
    // Same reasoning as /connect: a member who found this could only ever be
    // refused, so keep it out of their picker.
    default_member_permissions: "32",
    options: [
      {
        type: 3,
        name: "club",
        description: "Club slug, if you administer more than one",
        required: false,
        autocomplete: true,
      },
    ],
  },
  {
    type: 1,
    name: "bankpanel",
    description: "Post the club's Club Bank card in this channel (admins)",
    // Same reasoning as /panel: a member who found this could only ever be
    // refused, so keep it out of their picker.
    default_member_permissions: "32",
    options: [
      {
        type: 3,
        name: "club",
        description: "Club slug, if you administer more than one",
        required: false,
        autocomplete: true,
      },
    ],
  },
  {
    type: 1,
    name: "connect",
    description: "Bring a club into this server (club admins only)",
    // Hidden from anyone without Discord's Manage Server permission (1 << 5).
    // Presentation only: the real gate is the club's ADMIN portal role,
    // checked against the caller's linked account. Without this, every member
    // sees a setup command they can only ever be refused by.
    default_member_permissions: "32",
    options: [
      {
        type: 7, // channel
        name: "channel",
        description: "Officer channel where this club's tickets land for review",
        required: false,
      },
      {
        type: 7,
        name: "tickets",
        description: "Members' channel; the Activity Logger card is posted there",
        required: false,
      },
      {
        type: 3,
        name: "club",
        description: "Club slug, if you administer more than one",
        required: false,
      },
    ],
  },
];

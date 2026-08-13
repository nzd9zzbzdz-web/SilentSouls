import "server-only";
import { formatMoney } from "@/lib/constants";
import type { TreasuryTxKind } from "@/lib/types";

/**
 * The in-channel Club Bank card, and the forms it opens.
 *
 * Same split as the Activity Logger (see panel.ts) and for the same reason:
 * Discord cannot take typed text inside a channel message, so the CARD holds
 * the choice a dropdown can make and the DIALOG holds everything typed.
 *
 * Unlike the logger card, this one carries live data: the balance is baked
 * into the message and the card is edited in place whenever a movement is
 * approved (updateBankPanel in notify.ts). That makes it a standing balance
 * board rather than a button, which is the whole point of pinning it. If an
 * edit ever fails the card goes stale rather than wrong, and the dropdown's
 * own balance option always reads live.
 */

export const BANK_SELECT_PREFIX = "bank:";
export const BANK_MODAL_PREFIX = "bankform:";

/** Message flag IS_COMPONENTS_V2 (1 << 15). */
const COMPONENTS_V2 = 32768;

const CONTAINER = 17;
const TEXT_DISPLAY = 10;
const SEPARATOR = 14;
const ACTION_ROW = 1;
const STRING_SELECT = 3;
const TEXT_INPUT = 4;
const LABEL = 18;

/** The dropdown's four jobs. The first three open a form; the last reads. */
export const BANK_ACTIONS = [
  { value: "dues", label: "Pay Dues", description: "Your club dues" },
  { value: "deposit", label: "Deposit", description: "Money going into the bank" },
  { value: "withdrawal", label: "Withdrawal", description: "Money coming out" },
  { value: "balance", label: "Balance and ledger", description: "Read the account" },
] as const;

export function isTxKind(value: string): value is TreasuryTxKind {
  return value === "dues" || value === "deposit" || value === "withdrawal";
}

/**
 * The permanent card. Posted by /bankpanel and re-rendered on every approval,
 * so `balance` is always the number the message should currently show.
 */
export function buildBankPanelMessage(opts: {
  orgId: string;
  orgName: string;
  balance: number;
  accentColor: number | null;
}): Record<string, unknown> {
  return {
    flags: COMPONENTS_V2,
    components: [
      {
        type: CONTAINER,
        ...(opts.accentColor !== null ? { accent_color: opts.accentColor } : {}),
        components: [
          {
            type: TEXT_DISPLAY,
            content:
              `## 🏦 Club Bank\n` +
              `### ${formatMoney(opts.balance)}\n` +
              `**${opts.orgName}** · an admin or the Treasurer rules on every movement.`,
          },
          { type: SEPARATOR, divider: true, spacing: 1 },
          {
            type: ACTION_ROW,
            components: [
              {
                type: STRING_SELECT,
                // The club rides in the id: one server can host several.
                custom_id: `${BANK_SELECT_PREFIX}${opts.orgId}`,
                placeholder: "Choose a movement",
                options: BANK_ACTIONS.map((a) => ({
                  label: a.label,
                  value: a.value,
                  description: a.description,
                })),
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * The form for one movement. Dues describe themselves, so their note is
 * optional; money in or out has to say what for, matching the web form and
 * the schema's own rule.
 */
export function buildBankModal(
  orgId: string,
  kind: TreasuryTxKind,
): Record<string, unknown> {
  const title =
    kind === "dues" ? "Pay Dues" : kind === "deposit" ? "Log a Deposit" : "Request a Withdrawal";

  return {
    custom_id: `${BANK_MODAL_PREFIX}${orgId}:${kind}`,
    title,
    components: [
      {
        type: LABEL,
        label: "Amount",
        description: "Whole dollars. No minus signs.",
        component: {
          type: TEXT_INPUT,
          custom_id: "amount",
          style: 1, // short
          required: true,
          max_length: 12,
          placeholder: "500",
        },
      },
      {
        type: LABEL,
        label: kind === "dues" ? "Note" : "What for",
        description:
          kind === "dues"
            ? "Optional. Anything the Treasurer should know."
            : kind === "withdrawal"
              ? "Say what the money is for."
              : "Say where the money came from.",
        component: {
          type: TEXT_INPUT,
          custom_id: "note",
          style: 2, // paragraph
          required: kind !== "dues",
          max_length: 300,
          ...(kind === "dues" ? {} : { min_length: 3 }),
        },
      },
    ],
  };
}

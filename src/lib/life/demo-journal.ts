/**
 * The only journal in this repository.
 * Alex is a fictional, anonymized demo. Meeting code must not import this
 * module and must not read, log, or attach journal text to a provider.
 */
export const DEMO_JOURNAL = {
  subject: "Alex",
  anonymized: true,
  fictional: true,
  entries: [
    {
      loggedOn: "2026-10-27",
      body: "Alex noticed the morning felt steadier after a short walk.",
    },
  ],
} as const;

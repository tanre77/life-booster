import type { JournalEntry } from "./types.ts";

/**
 * Read-only journal for the fictional persona Alex.
 *
 * Member notes stay on `mood_entries` and only cover the signed-in week.
 * These entries are January 2026, so they are not seeded into that table.
 * `loadDemoJournal` returns them only when demo mode is on.
 */
export const DEMO_PERSONA_NOTE =
  "Fictional persona: Alex. All names, places, providers, and employers are made up. Based on real entries with identifying details removed.";

/**
 * Feeling words on the same 1–5 scale as `MOODS` (Heavy → Lifted).
 * A day's mood is the rounded average. The feeling line itself is not rewritten.
 */
const FEELING_MOOD: Record<string, number> = {
  depressed: 1,
  scared: 1,
  lonely: 1,
  disappointed: 1,
  anxious: 2,
  nervous: 2,
  hurt: 2,
  sad: 2,
  mad: 2,
  irritated: 2,
  upset: 2,
  confused: 2,
  alright: 3,
  thoughtful: 3,
  calm: 3,
  proud: 4,
  grateful: 4,
  hopeful: 4,
  nurturing: 4,
  resilient: 4,
  loved: 4,
};

export function moodForFeelings(feelings: string): number {
  const parts = feelings
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return 3;
  const scores = parts.map((part) => FEELING_MOOD[part] ?? 3);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.min(5, Math.max(1, Math.round(average)));
}

type Draft = { loggedOn: string; feelings: string; body: string };

const DRAFTS: Draft[] = [
  {
    loggedOn: "2026-01-05",
    feelings: "anxious, scared, nervous, depressed, lonely, disappointed",
    body: "I'm feeling a lot of this because I'm coming out of a manic episode and trying not to plummet into the depths. I hurt a lot of people this go-around, and I have a dog I'm scared to take care of because I struggle to take care of myself. It's a lot more responsibility, and I struggle with taking that on, knowing it wasn't really me who got this dog. My life got hijacked again by bipolar disorder, and I spent a lot of time and money on things I didn't need. Last year around this time I went into a depressive episode that lasted a couple of months, after being manic and buying a car I didn't need. I'm disappointed because it feels like I haven't grown, and I'm in the same spot I started in last year.",
  },
  {
    loggedOn: "2026-01-06",
    feelings: "thoughtful, nurturing, hurt, sad",
    body: "I had a hard day in therapy yesterday, and just putting the entry above into words made me cry. I scored my worst week in my program, but that's expected coming off the longest manic episode of my life so far. I've been thinking about the daily things I need to change for Biscuit so things go well for her, and I realized I have to do the same for myself. I am bigger than being bipolar, but if I keep my old habits, this illness will take me down to my core again. This isn't a moment of panic. It's a lesson I can learn now instead of the hard way next winter. I need to cut way back on cannabis. It can still be part of my life, but it can't be who I am. I need a flexible schedule that lets me practice what I'm learning in therapy every day, because that's the only way to become the best version of myself. My doctor called this \"breaking a bone in my brain,\" and I can't help others without a real recovery. I can't rely only on meds; some of this has to come from tender love and care. I want it fixed yesterday, but the slow grind is where real progress happens.",
  },
  {
    loggedOn: "2026-01-07",
    feelings: "proud, anxious, mad",
    body: "Rough start. Biscuit had two accidents in the house, and the group host didn't let me in until 15 minutes after start time when I showed up maybe 5 minutes late. I was also late taking my meds, and I'm frustrated with myself. I'm building a more flexible schedule so I can plan my return to work. I want to understand myself better and the reasons behind my manic actions. Starting a company would be a great idea, but I need to get myself straightened out first. I love my job and my team, and I'm eager to get back to a normal 9-to-5. I'm still bummed about being on medical leave and the pay cut, but it'll be over before I know it. These next few weeks I want to make a plan to return to work, then a plan for my side project. If I don't slow-burn this, it'll disappear as quickly as it lit.",
  },
  {
    loggedOn: "2026-01-08",
    feelings: "anxious, upset, calm",
    body: "I woke up from night terrors, which made for a bad start. Then, as group started, the vet called to say Biscuit has an infection and needs antibiotics. Group went okay, but I had a hard time reeling myself in afterward. We talked about how avoiding stress can lead to a more stable life with bipolar disorder. Then I called about my leave benefits, and they made a mistake and said I'd been let go, which scared me to my core.",
  },
  {
    loggedOn: "2026-01-09",
    feelings: "alright",
    body: "I woke up late because I hung out with my friend Sam last night, and it really lifted my spirit. Sam wants me to try a more intensive program somewhere else, but after the mess I caused, it's the last thing I want. I need a routine here at home that helps me become more well-rounded. I took a nap midday and woke up to Biscuit being sick. I'm practicing keeping my cool when things go wrong, because otherwise stress will take me out.",
  },
  {
    loggedOn: "2026-01-12",
    feelings: "irritated, anxious, nervous, sad, grateful",
    body: "I'm tired because I had a rec league game late last night. We did well, but Biscuit barked the whole time my partner Jamie and I were gone. I'm nervous about training her and feel like I'm not doing a good job. I have a couple more weeks of therapy before going back to work, and it feels like forever. I need to get back to my work routine, but I have to make changes or I'll end up in the same spot. I don't feel as terrible as last week, but I've been sleeping more. I'm not sure if I'm getting depressed or my body just needed rest. I'm grateful, though, because I'm alive and I can change the course I'm on. I don't need everything figured out; I just need to take life one challenge at a time.",
  },
  {
    loggedOn: "2026-01-13",
    feelings: "hopeful, nervous",
    body: "Yesterday I saw my individual therapist and my psychiatrist. I'm nervous about going back to work and what that will do to my routine. It looks like I'll be back next Wednesday at half capacity. Biscuit is still a handful in the mornings, and that's a problem I need to solve. Jamie has been a huge help, and I need to make sure Jamie feels appreciated. Jamie is my rock, and I need to work on myself so we can be the best team possible.",
  },
  {
    loggedOn: "2026-01-14",
    feelings: "anxious, scared, confused",
    body: "I'm trying to keep my head level, but it's been hard not to let anxiety rule me. It made me sick, and I had to lie down before therapy. I want my routine back, but now I'm scared to go back to work. My psychiatrist started me on a new medication, and I'm hopeful it'll help. I've been good about staying off cannabis, and I need to stay on that path to stay stable. I have to stop numbing myself with it, because it doesn't mix well with bipolar disorder.",
  },
  {
    loggedOn: "2026-01-15",
    feelings: "resilient, hopeful, anxious, loved",
    body: "I just got out of a session with a new individual therapist, and it went well. I don't love doing it, but I'm working through the discomfort. I want this to be normal so I don't end up in the same spot next winter. I'm going to be better for Jamie and my friends, who I really hurt during my last episode. I've opened up to having Biscuit and what she brings to Jamie and me. I'll do things for her that I struggle to do for myself, like getting outside every day. I'll get better over time, but it takes constant work. I need to work on how much stress runs my life, because that's a big part of what leads to my manic episodes. I have a great support system, and I have to show them I'm putting in the work.",
  },
];

export const DEMO_JOURNAL_ENTRIES: JournalEntry[] = DRAFTS.map((entry) => ({
  loggedOn: entry.loggedOn,
  feelings: entry.feelings,
  mood: moodForFeelings(entry.feelings),
  body: entry.body,
}));

export type DemoModeSource = {
  LIFE_BOOSTER_DEMO?: string;
  VITE_LIFE_BOOSTER_DEMO?: string;
  /** Raw query or a full href. `demo=1` (also true / yes / on) turns the journal on. */
  search?: string;
  /** Parsed `demo` search value, when the router has already decoded it. */
  demo?: unknown;
};

function flagOn(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function searchRequestsDemo(search: string | undefined): boolean {
  if (!search) return false;
  const query = search.includes("?") ? search.slice(search.indexOf("?") + 1) : search;
  const params = new URLSearchParams(query.split("#")[0] ?? "");
  return flagOn(params.get("demo"));
}

export function isDemoMode(source: DemoModeSource = demoModeFromProcess()): boolean {
  return (
    flagOn(source.LIFE_BOOSTER_DEMO) ||
    flagOn(source.VITE_LIFE_BOOSTER_DEMO) ||
    flagOn(source.demo) ||
    searchRequestsDemo(source.search)
  );
}

/** The nine Alex entries when demo mode is on, otherwise an empty list. */
export function loadDemoJournal(source: DemoModeSource = demoModeFromProcess()): JournalEntry[] {
  if (!isDemoMode(source)) return [];
  return DEMO_JOURNAL_ENTRIES;
}

function demoModeFromProcess(): DemoModeSource {
  if (typeof process === "undefined") return {};
  return {
    LIFE_BOOSTER_DEMO: process.env.LIFE_BOOSTER_DEMO,
    VITE_LIFE_BOOSTER_DEMO: process.env.VITE_LIFE_BOOSTER_DEMO,
  };
}

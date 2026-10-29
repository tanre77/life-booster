export type CounselorCard = {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  religions: string[];
  philosophies: string[];
  specialties: string[];
  hourlyRateCents: number;
  timezone: string;
  venmoHandle: string;
  standing: "active" | "dismissed";
  sample: boolean;
  rating: number;
  reviewCount: number;
  hours: string[];
};

export type ReviewItem = {
  id: number;
  stars: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
};

export type MoodEntry = {
  loggedOn: string;
  mood: number;
  note: string;
  shareWithCounselors: boolean;
};

export type Visit = {
  id: number;
  role: "member" | "counselor";
  otherName: string;
  otherId: string;
  startsAt: string;
  durationMin: number;
  amountCents: number;
  hourlyRateCents: number;
  payMethod: string;
  payStatus: string;
  status: string;
  shareMood: boolean;
  adsDiscount: boolean;
  hasReview: boolean;
};

export type Dashboard = {
  profile: { displayName: string; isOperator: boolean; deskClaimed: boolean };
  counselor: {
    headline: string;
    hourlyRateCents: number;
    standing: "active" | "dismissed";
    hasHours: boolean;
  } | null;
  moods: MoodEntry[];
  upcoming: Visit | null;
};

export type SessionRoom = {
  id: number;
  role: "member" | "counselor" | "solo";
  startsAt: string;
  durationMin: number;
  status: string;
  shareMood: boolean;
  otherName: string;
  counselorName: string;
  sample: boolean;
  notes: { loggedOn: string; mood: number; note: string }[];
};

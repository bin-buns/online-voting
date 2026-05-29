export type UserRole = "admin" | "voter" | "candidate";

export type Profile = {
  id: string;
  student_id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  strand: string | null;
  section: string | null;
};

export type ElectionSettings = {
  id: number;
  title: string;
  voting_starts_at: string;
  voting_ends_at: string;
  results_visible_at: string;
  is_active: boolean;
  updated_at: string;
};

export type Position = {
  id: string;
  name: string;
  description: string | null;
  max_winners: number;
  sort_order: number;
};

export type Candidate = {
  id: string;
  user_id: string;
  position_id: string;
  tagline: string | null;
  bio: string | null;
  photo_url: string | null;
  status: "pending" | "approved" | "rejected";
  profiles?: Pick<Profile, "full_name" | "student_id">;
  positions?: Pick<Position, "name">;
};

export type CampaignPost = {
  id: string;
  candidate_id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

export type Vote = {
  id: string;
  voter_id: string;
  candidate_id: string;
  position_id: string;
  created_at: string;
};

export type ElectionPhase = "upcoming" | "voting" | "closed" | "results";

export function getElectionPhase(settings: ElectionSettings): ElectionPhase {
  const now = Date.now();
  const start = new Date(settings.voting_starts_at).getTime();
  const end = new Date(settings.voting_ends_at).getTime();
  const results = new Date(settings.results_visible_at).getTime();

  if (now >= results) return "results";
  if (now > end) return "closed";
  if (now >= start && now <= end) return "voting";
  return "upcoming";
}


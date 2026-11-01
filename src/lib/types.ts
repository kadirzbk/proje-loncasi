export type RoleClass = "ARCHITECT" | "BLACKSMITH" | "RANGER" | "SCOUT";
export type QuestType = "CODE" | "DESIGN" | "QA_DOCS";
export type QuestStatus = "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type Rank = "owner" | "officer" | "member";

export interface Member {
  id: string;
  name: string;
  role: RoleClass;
  xp: number;
  rank?: Rank;
  handle?: string;
}

export interface DesignPin {
  id: string;
  x: number;
  y: number;
  text: string;
  authorId: string;
  resolved: boolean;
}

export interface DesignVersion {
  id: string;
  n: number;
  imageUrl: string;
  note: string;
  createdAt: string;
  pins: DesignPin[];
}

export interface CodeSubmission {
  branch: string;
  prNumber: number;
  additions: number;
  deletions: number;
  merged: boolean;
}

export interface Approval {
  reviewerId: string;
  status: "APPROVED" | "CHANGES_REQUESTED";
  comment: string;
}

export interface Quest {
  id: string;
  code: string;
  title: string;
  description: string;
  type: QuestType;
  status: QuestStatus;
  points: 1 | 2 | 3 | 5 | 8;
  role: RoleClass;
  assigneeId: string | null;
  prerequisiteId: string | null;
  focusMinutes: number;
  versions: DesignVersion[];
  submission: CodeSubmission | null;
  approvals: Approval[];
  rewarded: boolean;
  /** Kart bitince kazandırdığı XP; portfolyoya yazılır. */
  rewardXp?: number;
  completedAt?: string;
}

export interface Resources {
  stone: number;
  wood: number;
  mortar: number;
}

export interface Guild {
  id?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  visibility?: "public" | "private";
  recruiting?: boolean;
  name: string;
  resources: Resources;
  hp: number;
  maxHp: number;
  stability: number;
  siegesWon: number;
  siegesLost: number;
}

export interface GameState {
  guild: Guild;
  members: Member[];
  quests: Quest[];
  currentUserId: string;
  log: LogEntry[];
}

export interface LogEntry {
  id: string;
  at: string;
  text: string;
}

/* ---------------- sosyal katman ---------------- */

export interface Profile {
  id: string;
  handle: string;
  name: string;
  bio: string;
  skills: string[];
  mainRole: RoleClass;
  createdAt: string;
}

export interface Membership {
  guildId: string;
  slug: string;
  name: string;
  rank: Rank;
  role: RoleClass;
  xp: number;
}

export interface GuildCard {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  recruiting: boolean;
  resources: Resources;
  memberCount: number;
  openRoles: RoleClass[];
  doneCount: number;
  createdAt: string;
}

export interface Opening {
  id: string;
  guildId: string;
  guildSlug: string;
  guildName: string;
  role: RoleClass;
  title: string;
  description: string;
  skills: string[];
  status: "open" | "closed";
  createdAt: string;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Application {
  id: string;
  guildId: string;
  guildSlug: string;
  guildName: string;
  openingId: string | null;
  openingTitle: string | null;
  userId: string;
  applicant: Profile | null;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface Contribution {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  guildId: string;
  guildSlug: string;
  guildName: string;
  code: string;
  title: string;
  type: QuestType;
  role: RoleClass;
  points: number;
  xp: number;
  reviewerIds: string[];
  completedAt: string;
}

export interface Activity {
  id: string;
  guildId: string;
  guildSlug: string;
  guildName: string;
  actorHandle: string | null;
  kind: string;
  body: string;
  createdAt: string;
}

export interface GuildPage {
  card: GuildCard;
  description: string;
  visibility: "public" | "private";
  ownerId: string | null;
  members: Member[];
  openings: Opening[];
  contributions: Contribution[];
  activity: Activity[];
}

export interface ProfilePage {
  profile: Profile;
  memberships: Membership[];
  contributions: Contribution[];
  reviewsGiven: number;
}

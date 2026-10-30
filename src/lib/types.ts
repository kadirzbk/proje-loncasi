export type RoleClass = "ARCHITECT" | "BLACKSMITH" | "RANGER" | "SCOUT";
export type QuestType = "CODE" | "DESIGN" | "QA_DOCS";
export type QuestStatus = "BACKLOG" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface Member {
  id: string;
  name: string;
  role: RoleClass;
  xp: number;
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
}

export interface Resources {
  stone: number;
  wood: number;
  mortar: number;
}

export interface Guild {
  id?: string;
  inviteCode?: string;
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

import type { GoalLevel, GoalStatus } from "../constants.js";

export interface Goal {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  level: GoalLevel;
  status: GoalStatus;
  parentId: string | null;
  ownerAgentId: string | null;
  coverImageId: string | null;
  coverImageUrl: string | null;
  projectIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

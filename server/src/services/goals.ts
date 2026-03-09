import { eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { goals, projectGoals, assets } from "@paperclipai/db";

export function goalService(db: Db) {
  async function enrichGoals(rawGoals: (typeof goals.$inferSelect)[]) {
    if (rawGoals.length === 0) return [];
    const goalIds = rawGoals.map((g) => g.id);

    // Fetch project links
    const projectLinks = await db
      .select({ goalId: projectGoals.goalId, projectId: projectGoals.projectId })
      .from(projectGoals)
      .where(inArray(projectGoals.goalId, goalIds));

    const projectIdsByGoal = new Map<string, string[]>();
    for (const link of projectLinks) {
      const arr = projectIdsByGoal.get(link.goalId) ?? [];
      arr.push(link.projectId);
      projectIdsByGoal.set(link.goalId, arr);
    }

    // Fetch cover image URLs
    const coverIds = rawGoals.map((g) => g.coverImageId).filter(Boolean) as string[];
    const coverAssets =
      coverIds.length > 0
        ? await db.select({ id: assets.id, objectKey: assets.objectKey }).from(assets).where(inArray(assets.id, coverIds))
        : [];
    const coverUrlById = new Map(coverAssets.map((a) => [a.id, `/api/assets/${a.id}/content`]));

    return rawGoals.map((g) => ({
      ...g,
      projectIds: projectIdsByGoal.get(g.id) ?? [],
      coverImageUrl: g.coverImageId ? (coverUrlById.get(g.coverImageId) ?? null) : null,
    }));
  }

  async function syncProjects(goalId: string, companyId: string, projectIds: string[]) {
    // Delete existing links for this goal then insert the new set
    await db.delete(projectGoals).where(eq(projectGoals.goalId, goalId));
    if (projectIds.length > 0) {
      await db.insert(projectGoals).values(
        projectIds.map((projectId) => ({ goalId, projectId, companyId })),
      );
    }
  }

  return {
    list: async (companyId: string) => {
      const rows = await db.select().from(goals).where(eq(goals.companyId, companyId));
      return enrichGoals(rows);
    },

    getById: async (id: string) => {
      const rows = await db.select().from(goals).where(eq(goals.id, id));
      if (!rows[0]) return null;
      const enriched = await enrichGoals([rows[0]]);
      return enriched[0] ?? null;
    },

    create: async (
      companyId: string,
      data: Omit<typeof goals.$inferInsert, "companyId"> & { projectIds?: string[] },
    ) => {
      const { projectIds = [], ...goalData } = data;
      const [goal] = await db.insert(goals).values({ ...goalData, companyId }).returning();
      await syncProjects(goal.id, companyId, projectIds);
      const enriched = await enrichGoals([goal]);
      return enriched[0]!;
    },

    update: async (
      id: string,
      data: Partial<typeof goals.$inferInsert> & { projectIds?: string[] },
    ) => {
      const { projectIds, ...updateData } = data;
      const [updated] = await db
        .update(goals)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning();
      if (!updated) return null;
      if (projectIds !== undefined) {
        await syncProjects(id, updated.companyId, projectIds);
      }
      const enriched = await enrichGoals([updated]);
      return enriched[0] ?? null;
    },

    remove: async (id: string) => {
      const [removed] = await db.delete(goals).where(eq(goals.id, id)).returning();
      return removed ?? null;
    },
  };
}

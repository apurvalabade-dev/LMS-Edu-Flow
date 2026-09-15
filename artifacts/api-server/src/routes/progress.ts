import { Router } from "express";
import { db, progressTable, lessonsTable, modulesTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { CompleteLessonParams, GetCourseProgressParams } from "@workspace/api-zod";
import { authMiddleware, type AuthRequest } from "../lib/auth";

const router = Router();

router.post("/lessons/:id/complete", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const params = CompleteLessonParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(progressTable)
    .where(and(eq(progressTable.userId, req.user!.id), eq(progressTable.lessonId, params.data.id)));

  if (existing.length > 0) {
    const p = existing[0];
    res.json({ id: p.id, userId: p.userId, lessonId: p.lessonId, completed: p.completed, completedAt: p.completedAt.toISOString() });
    return;
  }

  const [progress] = await db
    .insert(progressTable)
    .values({ userId: req.user!.id, lessonId: params.data.id, completed: true })
    .returning();

  res.json({ id: progress.id, userId: progress.userId, lessonId: progress.lessonId, completed: progress.completed, completedAt: progress.completedAt.toISOString() });
});

router.get("/courses/:id/progress", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCourseProgressParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const allLessons = await db
    .select({ id: lessonsTable.id })
    .from(lessonsTable)
    .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
    .where(eq(modulesTable.courseId, params.data.id));

  const totalLessons = allLessons.length;
  const lessonIds = allLessons.map((l) => l.id);

  const completedRows = await db
    .select({ lessonId: progressTable.lessonId })
    .from(progressTable)
    .where(and(eq(progressTable.userId, req.user!.id), eq(progressTable.completed, true)));

  const completedLessonIds = completedRows
    .map((p) => p.lessonId)
    .filter((id) => lessonIds.includes(id));

  const completedLessons = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  res.json({ courseId: params.data.id, totalLessons, completedLessons, progressPercent, completedLessonIds });
});

export default router;

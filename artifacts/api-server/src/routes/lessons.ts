import { Router } from "express";
import { db, lessonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListLessonsParams, CreateLessonParams, CreateLessonBody,
  GetLessonParams, UpdateLessonParams, UpdateLessonBody, DeleteLessonParams,
} from "@workspace/api-zod";
import { authMiddleware, requireRole } from "../lib/auth";

const router = Router();

function formatLesson(l: typeof lessonsTable.$inferSelect) {
  return {
    id: l.id,
    moduleId: l.moduleId,
    title: l.title,
    type: l.type,
    videoUrl: l.videoUrl,
    content: l.content,
    duration: l.duration,
    order: l.order,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/modules/:moduleId/lessons", async (req, res): Promise<void> => {
  const params = ListLessonsParams.safeParse({ moduleId: req.params.moduleId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.moduleId, params.data.moduleId))
    .orderBy(lessonsTable.order);
  res.json(lessons.map(formatLesson));
});

router.post("/modules/:moduleId/lessons", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = CreateLessonParams.safeParse({ moduleId: req.params.moduleId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateLessonBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [lesson] = await db
    .insert(lessonsTable)
    .values({ moduleId: params.data.moduleId, ...body.data })
    .returning();
  res.status(201).json(formatLesson(lesson));
});

router.get("/lessons/:id", async (req, res): Promise<void> => {
  const params = GetLessonParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, params.data.id));
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  res.json(formatLesson(lesson));
});

router.patch("/lessons/:id", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = UpdateLessonParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateLessonBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [lesson] = await db
    .update(lessonsTable)
    .set(body.data)
    .where(eq(lessonsTable.id, params.data.id))
    .returning();
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  res.json(formatLesson(lesson));
});

router.delete("/lessons/:id", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = DeleteLessonParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(lessonsTable).where(eq(lessonsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

import { Router } from "express";
import { db, modulesTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListModulesParams, CreateModuleParams, CreateModuleBody,
  UpdateModuleParams, UpdateModuleBody, DeleteModuleParams,
} from "@workspace/api-zod";
import { authMiddleware, requireRole, type AuthRequest } from "../lib/auth";

const router = Router();

function formatModule(m: typeof modulesTable.$inferSelect) {
  return {
    id: m.id,
    courseId: m.courseId,
    title: m.title,
    description: m.description,
    order: m.order,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/courses/:courseId/modules", async (req, res): Promise<void> => {
  const params = ListModulesParams.safeParse({ courseId: req.params.courseId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const modules = await db
    .select()
    .from(modulesTable)
    .where(eq(modulesTable.courseId, params.data.courseId))
    .orderBy(modulesTable.order);
  res.json(modules.map(formatModule));
});

router.post("/courses/:courseId/modules", authMiddleware, requireRole("instructor", "admin"), async (req: AuthRequest, res): Promise<void> => {
  const params = CreateModuleParams.safeParse({ courseId: req.params.courseId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateModuleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.courseId));
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (req.user!.role !== "admin" && course.instructorId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [module] = await db
    .insert(modulesTable)
    .values({ courseId: params.data.courseId, ...body.data })
    .returning();
  res.status(201).json(formatModule(module));
});

router.patch("/modules/:id", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = UpdateModuleParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateModuleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [module] = await db
    .update(modulesTable)
    .set(body.data)
    .where(eq(modulesTable.id, params.data.id))
    .returning();
  if (!module) {
    res.status(404).json({ error: "Module not found" });
    return;
  }
  res.json(formatModule(module));
});

router.delete("/modules/:id", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = DeleteModuleParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(modulesTable).where(eq(modulesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

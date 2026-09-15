import { Router } from "express";
import { db, coursesTable, modulesTable, lessonsTable, enrollmentsTable, usersTable } from "@workspace/db";
import { eq, ilike, and, sql, count } from "drizzle-orm";
import {
  GetCourseParams, ListCoursesQueryParams, CreateCourseBody,
  UpdateCourseParams, UpdateCourseBody, DeleteCourseParams,
  PublishCourseParams, PublishCourseBody,
} from "@workspace/api-zod";
import { authMiddleware, requireRole, type AuthRequest } from "../lib/auth";

const router = Router();

function formatCourse(course: typeof coursesTable.$inferSelect, extra?: { instructorName?: string | null; totalLessons?: number; enrollmentCount?: number }) {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    instructorId: course.instructorId,
    instructorName: extra?.instructorName ?? null,
    category: course.category,
    thumbnailUrl: course.thumbnailUrl,
    published: course.published,
    totalLessons: extra?.totalLessons ?? 0,
    enrollmentCount: extra?.enrollmentCount ?? 0,
    createdAt: course.createdAt.toISOString(),
  };
}

router.get("/courses", async (req, res): Promise<void> => {
  const query = ListCoursesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { category, search, instructorId, page = 1, limit = 20 } = query.data;
  const offset = (page - 1) * limit;

  const conditions = [eq(coursesTable.published, true)];
  if (category) conditions.push(ilike(coursesTable.category, `%${category}%`));
  if (search) conditions.push(ilike(coursesTable.title, `%${search}%`));
  if (instructorId) conditions.push(eq(coursesTable.instructorId, instructorId));

  const whereClause = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(coursesTable)
    .where(whereClause);

  const courses = await db
    .select({
      course: coursesTable,
      instructorName: usersTable.name,
    })
    .from(coursesTable)
    .leftJoin(usersTable, eq(coursesTable.instructorId, usersTable.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(coursesTable.createdAt);

  // Get lesson counts and enrollment counts
  const courseIds = courses.map((c) => c.course.id);
  const lessonCounts: Record<number, number> = {};
  const enrollmentCounts: Record<number, number> = {};

  if (courseIds.length > 0) {
    const lcRows = await db
      .select({ courseId: modulesTable.courseId, cnt: count() })
      .from(lessonsTable)
      .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
      .where(sql`${modulesTable.courseId} = ANY(ARRAY[${sql.join(courseIds.map((id) => sql`${id}`), sql`, `)}]::int[])`)
      .groupBy(modulesTable.courseId);
    lcRows.forEach((r) => { lessonCounts[r.courseId] = Number(r.cnt); });

    const ecRows = await db
      .select({ courseId: enrollmentsTable.courseId, cnt: count() })
      .from(enrollmentsTable)
      .where(sql`${enrollmentsTable.courseId} = ANY(ARRAY[${sql.join(courseIds.map((id) => sql`${id}`), sql`, `)}]::int[])`)
      .groupBy(enrollmentsTable.courseId);
    ecRows.forEach((r) => { enrollmentCounts[r.courseId] = Number(r.cnt); });
  }

  res.json({
    courses: courses.map((c) => formatCourse(c.course, {
      instructorName: c.instructorName,
      totalLessons: lessonCounts[c.course.id] ?? 0,
      enrollmentCount: enrollmentCounts[c.course.id] ?? 0,
    })),
    total: Number(total),
    page,
    limit,
  });
});

router.post("/courses", authMiddleware, requireRole("instructor", "admin"), async (req: AuthRequest, res): Promise<void> => {
  const body = CreateCourseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [course] = await db
    .insert(coursesTable)
    .values({ ...body.data, instructorId: req.user!.id })
    .returning();
  res.status(201).json(formatCourse(course));
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const params = GetCourseParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ course: coursesTable, instructorName: usersTable.name })
    .from(coursesTable)
    .leftJoin(usersTable, eq(coursesTable.instructorId, usersTable.id))
    .where(eq(coursesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const modules = await db
    .select()
    .from(modulesTable)
    .where(eq(modulesTable.courseId, params.data.id))
    .orderBy(modulesTable.order);

  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(sql`${lessonsTable.moduleId} = ANY(SELECT id FROM modules WHERE course_id = ${params.data.id})`)
    .orderBy(lessonsTable.order);

  const [{ enrollmentCount }] = await db
    .select({ enrollmentCount: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.courseId, params.data.id));

  const modulesWithLessons = modules.map((m) => ({
    id: m.id,
    courseId: m.courseId,
    title: m.title,
    description: m.description,
    order: m.order,
    createdAt: m.createdAt.toISOString(),
    lessons: lessons
      .filter((l) => l.moduleId === m.id)
      .map((l) => ({
        id: l.id,
        moduleId: l.moduleId,
        title: l.title,
        type: l.type,
        videoUrl: l.videoUrl,
        content: l.content,
        duration: l.duration,
        order: l.order,
        createdAt: l.createdAt.toISOString(),
      })),
  }));

  res.json({
    ...formatCourse(row.course, { instructorName: row.instructorName, enrollmentCount: Number(enrollmentCount) }),
    modules: modulesWithLessons,
  });
});

router.patch("/courses/:id", authMiddleware, requireRole("instructor", "admin"), async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateCourseParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateCourseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.instructorId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [course] = await db
    .update(coursesTable)
    .set(body.data)
    .where(eq(coursesTable.id, params.data.id))
    .returning();
  res.json(formatCourse(course));
});

router.delete("/courses/:id", authMiddleware, requireRole("instructor", "admin"), async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteCourseParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.instructorId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(coursesTable).where(eq(coursesTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/courses/:id/publish", authMiddleware, requireRole("instructor", "admin"), async (req: AuthRequest, res): Promise<void> => {
  const params = PublishCourseParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = PublishCourseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (req.user!.role !== "admin" && existing.instructorId !== req.user!.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [course] = await db
    .update(coursesTable)
    .set({ published: body.data.published })
    .where(eq(coursesTable.id, params.data.id))
    .returning();
  res.json(formatCourse(course));
});

export default router;

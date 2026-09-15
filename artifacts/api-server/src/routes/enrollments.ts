import { Router } from "express";
import { db, enrollmentsTable, coursesTable, modulesTable, lessonsTable, progressTable, usersTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import {
  EnrollCourseParams, UnenrollCourseParams, GetCourseStudentsParams,
} from "@workspace/api-zod";
import { authMiddleware, type AuthRequest } from "../lib/auth";

const router = Router();

router.post("/courses/:id/enroll", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const params = EnrollCourseParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.user!.id), eq(enrollmentsTable.courseId, params.data.id)));

  if (existing) {
    res.status(409).json({ error: "Already enrolled" });
    return;
  }

  const [enrollment] = await db
    .insert(enrollmentsTable)
    .values({ userId: req.user!.id, courseId: params.data.id })
    .returning();

  res.status(201).json({
    id: enrollment.id,
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  });
});

router.delete("/courses/:id/unenroll", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const params = UnenrollCourseParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(enrollmentsTable)
    .where(and(eq(enrollmentsTable.userId, req.user!.id), eq(enrollmentsTable.courseId, params.data.id)));
  res.sendStatus(204);
});

router.get("/my-courses", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const enrollments = await db
    .select({ enrollment: enrollmentsTable, course: coursesTable })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(eq(enrollmentsTable.userId, req.user!.id))
    .orderBy(enrollmentsTable.enrolledAt);

  const result = await Promise.all(
    enrollments.map(async ({ enrollment, course }) => {
      const [instructor] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, course.instructorId));

      const totalLessonsResult = await db
        .select({ cnt: count() })
        .from(lessonsTable)
        .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
        .where(eq(modulesTable.courseId, course.id));
      const totalLessons = Number(totalLessonsResult[0]?.cnt ?? 0);

      const completedResult = await db
        .select({ cnt: count() })
        .from(progressTable)
        .innerJoin(lessonsTable, eq(progressTable.lessonId, lessonsTable.id))
        .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
        .where(and(eq(modulesTable.courseId, course.id), eq(progressTable.userId, req.user!.id), eq(progressTable.completed, true)));
      const completedLessons = Number(completedResult[0]?.cnt ?? 0);

      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        courseId: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        thumbnailUrl: course.thumbnailUrl,
        instructorName: instructor?.name ?? null,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        progressPercent,
        completedLessons,
        totalLessons,
      };
    })
  );

  res.json(result);
});

router.get("/courses/:id/students", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const params = GetCourseStudentsParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const enrollments = await db
    .select({ enrollment: enrollmentsTable, user: usersTable })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
    .where(eq(enrollmentsTable.courseId, params.data.id))
    .orderBy(enrollmentsTable.enrolledAt);

  res.json(enrollments.map(({ enrollment, user }) => ({
    id: enrollment.id,
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    userName: user.name,
    userEmail: user.email,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  })));
});

export default router;

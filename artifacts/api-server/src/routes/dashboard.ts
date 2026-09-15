import { Router } from "express";
import { db, usersTable, coursesTable, modulesTable, lessonsTable, enrollmentsTable, progressTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/dashboard/student", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.id;

  const [{ enrolledCourses }] = await db
    .select({ enrolledCourses: count() })
    .from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, userId));

  const [{ totalLessonsCompleted }] = await db
    .select({ totalLessonsCompleted: count() })
    .from(progressTable)
    .where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true)));

  // Get enrolled courses with progress
  const enrollments = await db
    .select({ enrollment: enrollmentsTable, course: coursesTable })
    .from(enrollmentsTable)
    .innerJoin(coursesTable, eq(enrollmentsTable.courseId, coursesTable.id))
    .where(eq(enrollmentsTable.userId, userId))
    .limit(5);

  const upcomingCourses = await Promise.all(
    enrollments.map(async ({ enrollment, course }) => {
      const [instructor] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, course.instructorId));

      const [{ totalLessons }] = await db
        .select({ totalLessons: count() })
        .from(lessonsTable)
        .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
        .where(eq(modulesTable.courseId, course.id));

      const [{ completedLessons }] = await db
        .select({ completedLessons: count() })
        .from(progressTable)
        .innerJoin(lessonsTable, eq(progressTable.lessonId, lessonsTable.id))
        .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
        .where(and(eq(modulesTable.courseId, course.id), eq(progressTable.userId, userId)));

      const t = Number(totalLessons);
      const c = Number(completedLessons);
      const progressPercent = t > 0 ? Math.round((c / t) * 100) : 0;

      return {
        courseId: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        thumbnailUrl: course.thumbnailUrl,
        instructorName: instructor?.name ?? null,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        progressPercent,
        completedLessons: c,
        totalLessons: t,
      };
    })
  );

  const completedCourses = upcomingCourses.filter((c) => c.progressPercent === 100).length;
  const averageProgress = upcomingCourses.length > 0
    ? Math.round(upcomingCourses.reduce((sum, c) => sum + c.progressPercent, 0) / upcomingCourses.length)
    : 0;

  // Recent activity
  const recentProgress = await db
    .select({ progress: progressTable, lesson: lessonsTable })
    .from(progressTable)
    .innerJoin(lessonsTable, eq(progressTable.lessonId, lessonsTable.id))
    .where(and(eq(progressTable.userId, userId), eq(progressTable.completed, true)))
    .orderBy(sql`${progressTable.completedAt} DESC`)
    .limit(5);

  const recentActivity = recentProgress.map(({ progress, lesson }) => ({
    type: "lesson_complete" as const,
    description: `Completed "${lesson.title}"`,
    courseTitle: null,
    createdAt: progress.completedAt.toISOString(),
  }));

  res.json({
    enrolledCourses: Number(enrolledCourses),
    completedCourses,
    totalLessonsCompleted: Number(totalLessonsCompleted),
    averageProgress,
    recentActivity,
    upcomingCourses,
  });
});

router.get("/dashboard/instructor", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.id;

  const [{ totalCourses }] = await db
    .select({ totalCourses: count() })
    .from(coursesTable)
    .where(eq(coursesTable.instructorId, userId));

  const [{ publishedCourses }] = await db
    .select({ publishedCourses: count() })
    .from(coursesTable)
    .where(and(eq(coursesTable.instructorId, userId), eq(coursesTable.published, true)));

  const myCourses = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.instructorId, userId));

  const myCourseIds = myCourses.map((c) => c.id);

  let totalStudents = 0;
  let totalLessons = 0;

  const courseStats = await Promise.all(
    myCourses.slice(0, 10).map(async (course) => {
      const [{ enrollmentCount }] = await db
        .select({ enrollmentCount: count() })
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.courseId, course.id));
      const [{ lessonCount }] = await db
        .select({ lessonCount: count() })
        .from(lessonsTable)
        .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
        .where(eq(modulesTable.courseId, course.id));

      totalStudents += Number(enrollmentCount);
      totalLessons += Number(lessonCount);

      return {
        courseId: course.id,
        title: course.title,
        category: course.category,
        enrollmentCount: Number(enrollmentCount),
        completionRate: 0,
        totalLessons: Number(lessonCount),
      };
    })
  );

  const recentEnrollments = await db
    .select({ enrollment: enrollmentsTable, user: usersTable })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.userId, usersTable.id))
    .where(myCourseIds.length > 0
      ? sql`${enrollmentsTable.courseId} = ANY(ARRAY[${sql.join(myCourseIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
      : sql`false`)
    .orderBy(sql`${enrollmentsTable.enrolledAt} DESC`)
    .limit(5);

  res.json({
    totalCourses: Number(totalCourses),
    publishedCourses: Number(publishedCourses),
    totalStudents,
    totalLessons,
    courseStats,
    recentEnrollments: recentEnrollments.map(({ enrollment, user }) => ({
      id: enrollment.id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      userName: user.name,
      userEmail: user.email,
      enrolledAt: enrollment.enrolledAt.toISOString(),
    })),
  });
});

router.get("/dashboard/admin", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const [[{ totalUsers }], [{ totalCourses }], [{ totalEnrollments }], [{ totalLessons }]] = await Promise.all([
    db.select({ totalUsers: count() }).from(usersTable),
    db.select({ totalCourses: count() }).from(coursesTable),
    db.select({ totalEnrollments: count() }).from(enrollmentsTable),
    db.select({ totalLessons: count() }).from(lessonsTable),
  ]);

  const [[{ students }], [{ instructors }], [{ admins }]] = await Promise.all([
    db.select({ students: count() }).from(usersTable).where(eq(usersTable.role, "student")),
    db.select({ instructors: count() }).from(usersTable).where(eq(usersTable.role, "instructor")),
    db.select({ admins: count() }).from(usersTable).where(eq(usersTable.role, "admin")),
  ]);

  const recentUsers = await db
    .select()
    .from(usersTable)
    .orderBy(sql`${usersTable.createdAt} DESC`)
    .limit(5);

  const topCourses = await db
    .select({ course: coursesTable })
    .from(coursesTable)
    .orderBy(coursesTable.createdAt)
    .limit(5);

  const topCoursesStats = await Promise.all(
    topCourses.map(async ({ course }) => {
      const [{ enrollmentCount }] = await db
        .select({ enrollmentCount: count() })
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.courseId, course.id));
      const [{ lessonCount }] = await db
        .select({ lessonCount: count() })
        .from(lessonsTable)
        .innerJoin(modulesTable, eq(lessonsTable.moduleId, modulesTable.id))
        .where(eq(modulesTable.courseId, course.id));
      return {
        courseId: course.id,
        title: course.title,
        category: course.category,
        enrollmentCount: Number(enrollmentCount),
        completionRate: 0,
        totalLessons: Number(lessonCount),
      };
    })
  );

  res.json({
    totalUsers: Number(totalUsers),
    totalCourses: Number(totalCourses),
    totalEnrollments: Number(totalEnrollments),
    totalLessons: Number(totalLessons),
    usersByRole: { student: Number(students), instructor: Number(instructors), admin: Number(admins) },
    recentUsers: recentUsers.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      avatarUrl: u.avatarUrl, bio: u.bio, createdAt: u.createdAt.toISOString(),
    })),
    topCourses: topCoursesStats,
  });
});

export default router;

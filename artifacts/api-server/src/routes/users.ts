import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or, sql, count } from "drizzle-orm";
import { GetUserParams, UpdateUserParams, UpdateUserBody, DeleteUserParams, ListUsersQueryParams } from "@workspace/api-zod";
import { authMiddleware, requireRole, type AuthRequest } from "../lib/auth";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/users", authMiddleware, requireRole("admin"), async (req: AuthRequest, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { role, search, page = 1, limit = 20 } = query.data;
  const offset = (page - 1) * limit;

  let baseQuery = db.select().from(usersTable);
  const conditions = [];
  if (role) conditions.push(eq(usersTable.role, role as "student" | "instructor" | "admin"));
  if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)));

  // Get total count
  const countResult = await db
    .select({ count: count() })
    .from(usersTable)
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`) : undefined);

  const total = Number(countResult[0]?.count ?? 0);

  const users = await db
    .select()
    .from(usersTable)
    .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`) : undefined)
    .limit(limit)
    .offset(offset)
    .orderBy(usersTable.createdAt);

  res.json({ users: users.map(formatUser), total, page, limit });
});

router.get("/users/:id", authMiddleware, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.patch("/users/:id", authMiddleware, requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name;
  if (body.data.role !== undefined) updates.role = body.data.role;
  if (body.data.bio !== undefined) updates.bio = body.data.bio;
  if (body.data.avatarUrl !== undefined) updates.avatarUrl = body.data.avatarUrl;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.delete("/users/:id", authMiddleware, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

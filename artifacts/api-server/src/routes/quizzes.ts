import { Router } from "express";
import { db, quizzesTable, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListQuizzesParams, CreateQuizParams, CreateQuizBody,
  GetQuizParams, DeleteQuizParams,
  SubmitQuizParams, SubmitQuizBody,
  CreateQuestionParams, CreateQuestionBody,
  DeleteQuestionParams,
} from "@workspace/api-zod";
import { authMiddleware, requireRole } from "../lib/auth";

const router = Router();

function formatQuiz(q: typeof quizzesTable.$inferSelect) {
  return {
    id: q.id,
    lessonId: q.lessonId,
    title: q.title,
    passingScore: q.passingScore,
    timeLimitMinutes: q.timeLimitMinutes,
    createdAt: q.createdAt.toISOString(),
  };
}

function formatQuestion(q: typeof questionsTable.$inferSelect, includeAnswer = false) {
  return {
    id: q.id,
    quizId: q.quizId,
    question: q.question,
    options: q.options,
    correctOption: includeAnswer ? q.correctOption : null,
    explanation: q.explanation,
    order: q.order,
  };
}

router.get("/lessons/:lessonId/quizzes", async (req, res): Promise<void> => {
  const params = ListQuizzesParams.safeParse({ lessonId: req.params.lessonId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const quizzes = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.lessonId, params.data.lessonId));
  res.json(quizzes.map(formatQuiz));
});

router.post("/lessons/:lessonId/quizzes", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = CreateQuizParams.safeParse({ lessonId: req.params.lessonId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateQuizBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [quiz] = await db
    .insert(quizzesTable)
    .values({ lessonId: params.data.lessonId, ...body.data })
    .returning();
  res.status(201).json(formatQuiz(quiz));
});

router.get("/quizzes/:id", async (req, res): Promise<void> => {
  const params = GetQuizParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, params.data.id));
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.quizId, params.data.id))
    .orderBy(questionsTable.order);

  res.json({
    ...formatQuiz(quiz),
    questions: questions.map((q) => formatQuestion(q, false)),
  });
});

router.delete("/quizzes/:id", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = DeleteQuizParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(quizzesTable).where(eq(quizzesTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/quizzes/:id/submit", authMiddleware, async (req, res): Promise<void> => {
  const params = SubmitQuizParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SubmitQuizBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, params.data.id));
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.quizId, params.data.id));

  const totalQuestions = questions.length;
  let correctAnswers = 0;
  const feedback = body.data.answers.map((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    const correct = question ? question.correctOption === answer.selectedOption : false;
    if (correct) correctAnswers++;
    return { questionId: answer.questionId, correct, correctOption: question?.correctOption ?? 0 };
  });

  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const passed = score >= quiz.passingScore;

  res.json({ quizId: quiz.id, score, passed, totalQuestions, correctAnswers, feedback });
});

router.post("/quizzes/:id/questions", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = CreateQuestionParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [question] = await db
    .insert(questionsTable)
    .values({ quizId: params.data.id, ...body.data })
    .returning();
  res.status(201).json(formatQuestion(question, true));
});

router.delete("/questions/:id", authMiddleware, requireRole("instructor", "admin"), async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(questionsTable).where(eq(questionsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

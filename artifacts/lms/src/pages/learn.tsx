import { useParams, useLocation } from "wouter";
import { useState } from "react";
import {
  useGetCourse,
  useGetLesson,
  useCompleteLesson,
  useGetCourseProgress,
  useListQuizzes,
  useGetQuiz,
  useSubmitQuiz,
  getGetLessonQueryKey,
  getGetCourseProgressQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Play,
  List,
  Check,
} from "lucide-react";

export default function Learn() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  const cId = Number(courseId);
  const lId = Number(lessonId);

  const { data: course } = useGetCourse(cId, {
    query: { queryKey: ["course", cId], enabled: !!cId },
  });

  const { data: lesson } = useGetLesson(lId, {
    query: { queryKey: getGetLessonQueryKey(lId), enabled: !!lId },
  });

  const { data: progressData } = useGetCourseProgress(cId, {
    query: { queryKey: ["course-progress", cId], enabled: !!cId },
  });

  const { data: quizzesData } = useListQuizzes(lId, {
    query: { queryKey: ["quizzes", lId], enabled: !!lId },
  });

  const quiz = Array.isArray(quizzesData) ? quizzesData[0] : undefined;

  const { data: quizDetail } = useGetQuiz(quiz?.id ?? 0, {
    query: { queryKey: ["quiz", quiz?.id], enabled: !!quiz?.id },
  });

  const completeMutation = useCompleteLesson();
  const submitQuizMutation = useSubmitQuiz();

  const isCompleted = progressData?.completedLessonIds?.includes(lId);

  const allLessons = course?.modules?.flatMap((m) =>
    (m.lessons ?? []).map((l) => ({ ...l, moduleTitle: m.title }))
  ) ?? [];

  const currentIndex = allLessons.findIndex((l) => l.id === lId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const handleComplete = () => {
    completeMutation.mutate(
      { id: lId },
      {
        onSuccess: () => {
          toast({ title: "Lesson marked as complete!" });
          queryClient.invalidateQueries({ queryKey: ["course-progress", cId] });
          if (nextLesson) {
            setLocation(`/learn/${cId}/lessons/${nextLesson.id}`);
          }
        },
      }
    );
  };

  const handleSubmitQuiz = () => {
    if (!quizDetail || !quiz) return;
    const answers: { questionId: number; selectedOption: number }[] = quizDetail.questions.map(
      (q) => ({ questionId: q.id, selectedOption: quizAnswers[q.id] ?? 0 })
    );
    submitQuizMutation.mutate(
      { id: quiz.id, data: { answers } },
      {
        onSuccess: (result) => {
          setQuizResult(result);
          setQuizSubmitted(true);
          if (result.passed) {
            toast({ title: `Quiz passed! Score: ${result.score}%` });
            queryClient.invalidateQueries({ queryKey: ["course-progress", cId] });
          } else {
            toast({
              title: `Quiz not passed. Score: ${result.score}%`,
              description: `Need ${quizDetail?.passingScore}% to pass.`,
              variant: "destructive",
            });
          }
        },
      }
    );
  };

  const completedLessonIds = new Set(progressData?.completedLessonIds ?? []);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {sidebarOpen && (
          <aside className="w-72 border-r overflow-y-auto shrink-0 bg-background">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-sm line-clamp-2">{course?.title}</h2>
              {progressData && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${progressData.totalLessons > 0 ? Math.round((progressData.completedLessons / progressData.totalLessons) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progressData.completedLessons} / {progressData.totalLessons} lessons
                  </p>
                </div>
              )}
            </div>
            <div className="divide-y">
              {course?.modules?.map((mod) => (
                <div key={mod.id}>
                  <div className="px-4 py-2 bg-muted/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {mod.title}
                    </p>
                  </div>
                  {mod.lessons?.map((l) => {
                    const done = completedLessonIds.has(l.id);
                    const active = l.id === lId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setLocation(`/learn/${cId}/lessons/${l.id}`)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-2 text-sm transition-colors hover:bg-muted/50 ${active ? "bg-primary/10 text-primary font-medium" : ""}`}
                      >
                        {done ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <div className={`h-4 w-4 rounded-full border-2 mt-0.5 shrink-0 ${active ? "border-primary" : "border-muted-foreground/40"}`} />
                        )}
                        <span className="line-clamp-2">{l.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4 py-2 flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!prevLesson}
              onClick={() => prevLesson && setLocation(`/learn/${cId}/lessons/${prevLesson.id}`)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground flex-1 truncate">{lesson?.title}</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!nextLesson}
              onClick={() => nextLesson && setLocation(`/learn/${cId}/lessons/${nextLesson.id}`)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {isCompleted ? (
              <Badge variant="default" className="bg-green-600 gap-1">
                <Check className="h-3 w-3" /> Done
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? "Saving..." : "Mark Complete"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{lesson?.type}</Badge>
                  {lesson?.duration && (
                    <span className="text-sm text-muted-foreground">{lesson.duration} min</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold">{lesson?.title}</h1>
              </div>

              {lesson?.type === "video" && lesson.videoUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={lesson.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={lesson.title}
                  />
                </div>
              )}

              {lesson?.content && (
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="whitespace-pre-wrap leading-relaxed">{lesson.content}</p>
                </div>
              )}

              {quizDetail && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {quizDetail.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Passing score: {quizDetail.passingScore}%
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {quizDetail.questions.map((q, qi) => (
                      <div key={q.id} className="space-y-3">
                        <p className="font-medium">
                          {qi + 1}. {q.question}
                        </p>
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => {
                            const selected = quizAnswers[q.id] === oi;
                            const feedback = quizResult?.feedback?.find(
                              (f: any) => f.questionId === q.id
                            );
                            const correct = quizSubmitted && oi === q.correctOption;
                            const wrong = quizSubmitted && selected && !correct;
                            return (
                              <button
                                key={oi}
                                disabled={quizSubmitted}
                                onClick={() =>
                                  !quizSubmitted &&
                                  setQuizAnswers((prev) => ({ ...prev, [q.id]: oi }))
                                }
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                                  correct
                                    ? "border-green-500 bg-green-50 text-green-800"
                                    : wrong
                                      ? "border-red-400 bg-red-50 text-red-700"
                                      : selected
                                        ? "border-primary bg-primary/10"
                                        : "hover:bg-muted/50"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted && (
                          <p className="text-xs text-muted-foreground italic">
                            {quizResult?.feedback?.find((f: any) => f.questionId === q.id)?.explanation}
                          </p>
                        )}
                      </div>
                    ))}

                    {!quizSubmitted ? (
                      <Button
                        onClick={handleSubmitQuiz}
                        disabled={
                          submitQuizMutation.isPending ||
                          Object.keys(quizAnswers).length < quizDetail.questions.length
                        }
                      >
                        {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
                      </Button>
                    ) : (
                      <div className={`p-4 rounded-lg ${quizResult?.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                        <p className={`font-semibold ${quizResult?.passed ? "text-green-800" : "text-red-700"}`}>
                          {quizResult?.passed ? "Passed!" : "Not passed"} — Score: {quizResult?.score}%
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                            setQuizResult(null);
                          }}
                        >
                          Try again
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && setLocation(`/learn/${cId}/lessons/${prevLesson.id}`)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                {nextLesson ? (
                  <Button onClick={() => setLocation(`/learn/${cId}/lessons/${nextLesson.id}`)}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/courses/${cId}`)}
                  >
                    Back to Course
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

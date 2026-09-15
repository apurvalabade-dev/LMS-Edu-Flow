import { useParams, useLocation } from "wouter";
import { useGetCourse, useEnrollCourse, useGetCourseProgress } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Users, Play, CheckCircle, Lock, ChevronRight } from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const courseId = Number(id);

  const { data: course, isLoading } = useGetCourse(courseId, {
    query: { queryKey: ["course", courseId], enabled: !!courseId },
  });

  const { data: progressData } = useGetCourseProgress(courseId, {
    query: {
      queryKey: ["course-progress", courseId],
      enabled: !!user && !!courseId,
      retry: false,
    },
  });

  const enrollMutation = useEnrollCourse();

  const isEnrolled = !!progressData;
  const completedLessons = progressData?.completedLessons ?? 0;
  const totalLessons = progressData?.totalLessons ?? 0;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const firstLesson = course?.modules?.[0]?.lessons?.[0];

  const handleEnroll = () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    enrollMutation.mutate(
      { id: courseId },
      {
        onSuccess: () => {
          toast({ title: "Enrolled!", description: "You are now enrolled in this course." });
          queryClient.invalidateQueries({ queryKey: ["course-progress", courseId] });
          queryClient.invalidateQueries({ queryKey: ["my-courses"] });
          if (firstLesson) {
            setLocation(`/learn/${courseId}/lessons/${firstLesson.id}`);
          }
        },
        onError: () => {
          toast({ title: "Enrollment failed", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-5xl px-4 py-10 animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="container mx-auto max-w-5xl px-4 py-20 text-center">
          <p className="text-muted-foreground">Course not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 border-b py-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-4">
          {course.category && (
            <Badge variant="secondary">{course.category}</Badge>
          )}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{course.title}</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">{course.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {(course as any).enrollmentCount ?? 0} students
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {(course as any).lessonCount ?? 0} lessons
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-10 grid md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Course Curriculum</h2>
            {course.modules?.map((mod) => (
              <Card key={mod.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{mod.title}</CardTitle>
                  {mod.description && (
                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 divide-y">
                  {mod.lessons?.map((lesson) => {
                    const completed = progressData?.completedLessonIds?.includes(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          {completed ? (
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          ) : isEnrolled ? (
                            <Play className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium">{lesson.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {lesson.type}
                          </Badge>
                          {lesson.duration && (
                            <span className="text-xs text-muted-foreground">{lesson.duration}m</span>
                          )}
                          {isEnrolled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() =>
                                setLocation(`/learn/${courseId}/lessons/${lesson.id}`)
                              }
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4 md:sticky md:top-24">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {isEnrolled ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Your progress</span>
                      <span className="text-muted-foreground">{progressPct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {completedLessons} / {totalLessons} lessons completed
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      firstLesson &&
                      setLocation(`/learn/${courseId}/lessons/${firstLesson.id}`)
                    }
                  >
                    {completedLessons > 0 ? "Continue Learning" : "Start Course"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Enroll to access all lessons and track your progress.
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleEnroll}
                    disabled={enrollMutation.isPending}
                  >
                    {enrollMutation.isPending ? "Enrolling..." : "Enroll for Free"}
                  </Button>
                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      <a href="/login" className="text-primary hover:underline">
                        Log in
                      </a>{" "}
                      or{" "}
                      <a href="/register" className="text-primary hover:underline">
                        sign up
                      </a>{" "}
                      to enroll.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span>{(course as any).lessonCount ?? 0} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{(course as any).enrollmentCount ?? 0} students enrolled</span>
              </div>
              {course.category && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{course.category}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

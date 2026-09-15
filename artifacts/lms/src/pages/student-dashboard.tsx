import { Link, useLocation } from "wouter";
import { useGetStudentDashboard, useGetMyCourses } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { SidebarLayout, StudentSidebar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, TrendingUp, Clock } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useGetStudentDashboard({
    query: { queryKey: ["student-dashboard"] },
  });

  const { data: enrolledCourses = [] } = useGetMyCourses({
    query: { queryKey: ["my-courses"] },
  });

  const stats = [
    { label: "Enrolled Courses", value: data?.enrolledCourses ?? 0, icon: BookOpen },
    { label: "Completed Courses", value: data?.completedCourses ?? 0, icon: CheckCircle },
    { label: "Lessons Completed", value: data?.totalLessonsCompleted ?? 0, icon: TrendingUp },
  ];

  const inProgress = (enrolledCourses as any[]).filter(
    (c) => c.completedLessons > 0 && c.completedLessons < c.totalLessons
  );
  const notStarted = (enrolledCourses as any[]).filter((c) => c.completedLessons === 0);
  const continueList = inProgress.length > 0 ? inProgress : notStarted;

  return (
    <SidebarLayout sidebar={<StudentSidebar />}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground mt-1">Here's your learning progress at a glance.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{isLoading ? "—" : value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {data?.recentActivity && data.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {data.recentActivity.slice(0, 5).map((item, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.courseTitle ?? item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Badge
                    variant={item.type === "lesson_complete" ? "default" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {item.type === "lesson_complete"
                      ? "Completed"
                      : item.type === "enrollment"
                        ? "Enrolled"
                        : item.type === "quiz_passed"
                          ? "Quiz Passed"
                          : "Activity"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {continueList.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {inProgress.length > 0 ? "Continue Learning" : "Start Learning"}
            </h2>
            <div className="grid gap-4">
              {continueList.slice(0, 4).map((course: any) => {
                const pct =
                  course.totalLessons > 0
                    ? Math.round((course.completedLessons / course.totalLessons) * 100)
                    : 0;
                return (
                  <Card key={course.courseId} className="hover:shadow-sm transition-shadow">
                    <CardContent className="pt-6 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="font-medium truncate">{course.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{course.completedLessons} / {course.totalLessons} lessons</span>
                          <span>{pct}% complete</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setLocation(`/courses/${course.courseId}`)}>
                        {pct > 0 ? "Continue" : "Start"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {(enrolledCourses as any[]).length === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">No courses yet</p>
                <p className="text-sm text-muted-foreground">Start learning by browsing our catalog</p>
              </div>
              <Link href="/courses">
                <Button>Browse Courses</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}

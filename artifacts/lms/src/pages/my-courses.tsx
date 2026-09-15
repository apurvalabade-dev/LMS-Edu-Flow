import { Link, useLocation } from "wouter";
import { useGetMyCourses } from "@workspace/api-client-react";
import { SidebarLayout, StudentSidebar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

export default function MyCourses() {
  const [, setLocation] = useLocation();

  const { data: courses = [], isLoading } = useGetMyCourses({
    query: { queryKey: ["my-courses"] },
  });

  return (
    <SidebarLayout sidebar={<StudentSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Learning</h1>
          <p className="text-muted-foreground mt-1">All your enrolled courses in one place.</p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-2 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (courses as any[]).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">No enrolled courses</p>
                <p className="text-sm text-muted-foreground">
                  Browse our catalog and enroll in a course to get started.
                </p>
              </div>
              <Link href="/courses">
                <Button>Browse Courses</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {(courses as any[]).map((course) => {
              const pct =
                course.totalLessons > 0
                  ? Math.round((course.completedLessons / course.totalLessons) * 100)
                  : 0;
              const isComplete = pct === 100;

              return (
                <Card key={course.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    {isComplete && (
                      <Badge variant="default" className="w-fit mb-2 bg-green-600">
                        Completed
                      </Badge>
                    )}
                    <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                    {course.category && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        {course.category}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>
                          {(course as any).completedLessons ?? 0} /{" "}
                          {(course as any).totalLessons ?? 0} lessons
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button
                      className="flex-1"
                      variant={isComplete ? "outline" : "default"}
                      onClick={() => setLocation(`/courses/${course.id}`)}
                    >
                      {isComplete ? "Review Course" : pct > 0 ? "Continue" : "Start Learning"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

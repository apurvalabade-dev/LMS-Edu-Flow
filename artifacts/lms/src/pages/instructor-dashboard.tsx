import { Link, useLocation } from "wouter";
import { useGetInstructorDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { SidebarLayout, InstructorSidebar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, TrendingUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useGetInstructorDashboard({
    query: { queryKey: ["instructor-dashboard"] },
  });

  const stats = [
    { label: "Total Courses", value: data?.totalCourses ?? 0, icon: BookOpen },
    { label: "Published Courses", value: data?.publishedCourses ?? 0, icon: TrendingUp },
    { label: "Total Students", value: data?.totalStudents ?? 0, icon: Users },
  ];

  return (
    <SidebarLayout sidebar={<InstructorSidebar />}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.name?.split(" ")[0]}!</p>
          </div>
          <Link href="/instructor/courses/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </Link>
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

        {data?.recentEnrollments && data.recentEnrollments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Recent Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {data.recentEnrollments.slice(0, 5).map((item, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Course #{item.courseId}</p>
                    <p className="text-xs text-muted-foreground">
                      Enrolled {new Date(item.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    New Student
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data?.courseStats && data.courseStats.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Course Performance</h2>
            <div className="grid gap-4">
              {data.courseStats.map((cs) => (
                <Card key={cs.courseId} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-6 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{cs.title}</p>
                        {cs.category && (
                          <Badge variant="outline" className="text-xs shrink-0">{cs.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cs.enrollmentCount} students · {cs.totalLessons ?? 0} lessons · {cs.completionRate}% completion
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/instructor/courses/${cs.courseId}/edit`)}
                    >
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {(!data?.courseStats || data.courseStats.length === 0) && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">No courses yet</p>
                <p className="text-sm text-muted-foreground">Create your first course and start teaching</p>
              </div>
              <Link href="/instructor/courses/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}

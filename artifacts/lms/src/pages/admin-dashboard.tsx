import { Link, useLocation } from "wouter";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { SidebarLayout, AdminSidebar } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, GraduationCap } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useGetAdminDashboard({
    query: { queryKey: ["admin-dashboard"] },
  });

  const stats = [
    { label: "Total Users", value: data?.totalUsers ?? 0, icon: Users, sub: "All roles" },
    { label: "Total Courses", value: data?.totalCourses ?? 0, icon: BookOpen, sub: "Platform-wide" },
    { label: "Enrollments", value: data?.totalEnrollments ?? 0, icon: GraduationCap, sub: "Active" },
  ];

  return (
    <SidebarLayout sidebar={<AdminSidebar />}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon, sub }) => (
            <Card key={label}>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{isLoading ? "—" : value}</div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{sub}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {data?.usersByRole && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Users by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Admin</Badge>
                  <span className="text-sm font-medium">{data.usersByRole.admin ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Instructor</Badge>
                  <span className="text-sm font-medium">{data.usersByRole.instructor ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Student</Badge>
                  <span className="text-sm font-medium">{data.usersByRole.student ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {data?.recentUsers && data.recentUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Users</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {data.recentUsers.slice(0, 5).map((u) => (
                <div key={u.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {data?.topCourses && data.topCourses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Courses</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {data.topCourses.map((cs) => (
                <div key={cs.courseId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{cs.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cs.enrollmentCount} students · {cs.completionRate}% completion
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation(`/courses/${cs.courseId}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Card
            className="hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => setLocation("/admin/users")}
          >
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Manage Users</p>
                <p className="text-sm text-muted-foreground">View, edit, and manage all platform users</p>
              </div>
              <Button variant="outline" size="sm">View</Button>
            </CardContent>
          </Card>
          <Card
            className="hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => setLocation("/admin/courses")}
          >
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Manage Courses</p>
                <p className="text-sm text-muted-foreground">Oversee all courses across the platform</p>
              </div>
              <Button variant="outline" size="sm">View</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}

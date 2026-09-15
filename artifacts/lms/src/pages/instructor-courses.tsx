import { Link, useLocation } from "wouter";
import { useListCourses, useDeleteCourse, usePublishCourse } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { SidebarLayout, InstructorSidebar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";

export default function InstructorCourses() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListCourses(
    { instructorId: user?.id },
    { query: { queryKey: ["instructor-courses", user?.id] } }
  );

  const deleteMutation = useDeleteCourse();
  const publishMutation = usePublishCourse();

  const courses = (data?.courses ?? []).filter(
    (c) => (c as any).instructorId === user?.id
  );

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Course deleted" });
          queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
        },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  };

  const handleTogglePublish = (id: number, published: boolean) => {
    publishMutation.mutate(
      { id, data: { published: !published } },
      {
        onSuccess: () => {
          toast({ title: published ? "Course unpublished" : "Course published!" });
          queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
          queryClient.invalidateQueries({ queryKey: ["instructor-dashboard"] });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  return (
    <SidebarLayout sidebar={<InstructorSidebar />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Courses</h1>
            <p className="text-muted-foreground mt-1">Manage your course catalog</p>
          </div>
          <Link href="/instructor/courses/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">No courses yet</p>
                <p className="text-sm text-muted-foreground">Create your first course to get started</p>
              </div>
              <Link href="/instructor/courses/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                    <Badge variant={course.published ? "default" : "secondary"} className="shrink-0 text-xs">
                      {course.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  {course.category && (
                    <Badge variant="outline" className="w-fit text-xs">{course.category}</Badge>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                  <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                    <span>{(course as any).enrollmentCount ?? 0} students</span>
                    <span>{(course as any).lessonCount ?? 0} lessons</span>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setLocation(`/instructor/courses/${course.id}/edit`)}
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleTogglePublish(course.id, course.published ?? false)}
                    disabled={publishMutation.isPending}
                  >
                    {course.published ? (
                      <><EyeOff className="h-3 w-3" />Unpublish</>
                    ) : (
                      <><Eye className="h-3 w-3" />Publish</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(course.id, course.title)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useListCourses, useDeleteCourse, usePublishCourse } from "@workspace/api-client-react";
import { SidebarLayout, AdminSidebar } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";

export default function AdminCourses() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListCourses(
    {},
    { query: { queryKey: ["admin-courses"] } }
  );

  const deleteMutation = useDeleteCourse();
  const publishMutation = usePublishCourse();

  const courses = data?.courses ?? [];
  const filtered = courses.filter(
    (c) =>
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Delete course "${title}"? This will remove all enrollments.`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Course deleted" });
          queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
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
          queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  return (
    <SidebarLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Course Management</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No courses found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((course) => (
              <Card key={course.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{course.title}</p>
                      <Badge
                        variant={course.published ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {course.published ? "Published" : "Draft"}
                      </Badge>
                      {course.category && (
                        <Badge variant="outline" className="text-xs">
                          {course.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>by {(course as any).instructorName ?? "—"}</span>
                      <span>{(course as any).enrollmentCount ?? 0} students</span>
                      <span>{(course as any).lessonCount ?? 0} lessons</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="View course"
                      onClick={() => setLocation(`/courses/${course.id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={course.published ? "Unpublish" : "Publish"}
                      disabled={publishMutation.isPending}
                      onClick={() => handleTogglePublish(course.id, course.published ?? false)}
                    >
                      {course.published ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(course.id, course.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

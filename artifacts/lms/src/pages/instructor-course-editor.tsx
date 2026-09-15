import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  useGetCourse,
  useCreateCourse,
  useUpdateCourse,
  useCreateModule,
  useDeleteModule,
  useCreateLesson,
  useDeleteLesson,
  usePublishCourse,
} from "@workspace/api-client-react";
import { SidebarLayout, InstructorSidebar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  Eye,
  EyeOff,
  BookOpen,
} from "lucide-react";

export default function InstructorCourseEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";
  const courseId = isNew ? null : Number(id);

  const { data: course, isLoading } = useGetCourse(courseId ?? 0, {
    query: { queryKey: ["course", courseId], enabled: !!courseId },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingLessonFor, setAddingLessonFor] = useState<number | null>(null);
  const [newLesson, setNewLesson] = useState({ title: "", type: "text" as "text" | "video", content: "", videoUrl: "", duration: "" });

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description ?? "");
      setCategory(course.category ?? "");
    }
  }, [course]);

  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const createModuleMutation = useCreateModule();
  const deleteModuleMutation = useDeleteModule();
  const createLessonMutation = useCreateLesson();
  const deleteLessonMutation = useDeleteLesson();
  const publishMutation = usePublishCourse();

  const handleSaveCourse = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (isNew) {
      createMutation.mutate(
        { data: { title, description, category } },
        {
          onSuccess: (created) => {
            toast({ title: "Course created!" });
            queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
            setLocation(`/instructor/courses/${created.id}/edit`);
          },
          onError: () => toast({ title: "Failed to create", variant: "destructive" }),
        }
      );
    } else {
      updateMutation.mutate(
        { id: courseId!, data: { title, description, category } },
        {
          onSuccess: () => {
            toast({ title: "Course saved!" });
            queryClient.invalidateQueries({ queryKey: ["course", courseId] });
            queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
          },
          onError: () => toast({ title: "Failed to save", variant: "destructive" }),
        }
      );
    }
  };

  const handleAddModule = () => {
    if (!newModuleTitle.trim() || !courseId) return;
    const order = (course?.modules?.length ?? 0) + 1;
    createModuleMutation.mutate(
      { courseId, data: { title: newModuleTitle, order } },
      {
        onSuccess: (mod) => {
          toast({ title: "Module added" });
          setNewModuleTitle("");
          setExpandedModules((prev) => new Set([...prev, mod.id]));
          queryClient.invalidateQueries({ queryKey: ["course", courseId] });
        },
        onError: () => toast({ title: "Failed to add module", variant: "destructive" }),
      }
    );
  };

  const handleDeleteModule = (moduleId: number) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    deleteModuleMutation.mutate(
      { id: moduleId },
      {
        onSuccess: () => {
          toast({ title: "Module deleted" });
          queryClient.invalidateQueries({ queryKey: ["course", courseId] });
        },
        onError: () => toast({ title: "Failed to delete module", variant: "destructive" }),
      }
    );
  };

  const handleAddLesson = (moduleId: number) => {
    if (!newLesson.title.trim()) return;
    const mod = course?.modules?.find((m) => m.id === moduleId);
    const order = (mod?.lessons?.length ?? 0) + 1;
    createLessonMutation.mutate(
      {
        moduleId,
        data: {
          title: newLesson.title,
          type: newLesson.type,
          content: newLesson.content || undefined,
          videoUrl: newLesson.videoUrl || undefined,
          duration: newLesson.duration ? Number(newLesson.duration) : undefined,
          order,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lesson added" });
          setNewLesson({ title: "", type: "text", content: "", videoUrl: "", duration: "" });
          setAddingLessonFor(null);
          queryClient.invalidateQueries({ queryKey: ["course", courseId] });
        },
        onError: () => toast({ title: "Failed to add lesson", variant: "destructive" }),
      }
    );
  };

  const handleDeleteLesson = (moduleId: number, lessonId: number) => {
    if (!confirm("Delete this lesson?")) return;
    deleteLessonMutation.mutate(
      { id: lessonId },
      {
        onSuccess: () => {
          toast({ title: "Lesson deleted" });
          queryClient.invalidateQueries({ queryKey: ["course", courseId] });
        },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      }
    );
  };

  const handleTogglePublish = () => {
    if (!courseId) return;
    publishMutation.mutate(
      { id: courseId, data: { published: !course?.published } },
      {
        onSuccess: () => {
          toast({ title: course?.published ? "Course unpublished" : "Course published!" });
          queryClient.invalidateQueries({ queryKey: ["course", courseId] });
          queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  return (
    <SidebarLayout sidebar={<InstructorSidebar />}>
      <div className="space-y-8 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{isNew ? "Create Course" : "Edit Course"}</h1>
          {!isNew && (
            <div className="flex items-center gap-2">
              <Badge variant={course?.published ? "default" : "secondary"}>
                {course?.published ? "Published" : "Draft"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleTogglePublish}
                disabled={publishMutation.isPending}
              >
                {course?.published ? (
                  <><EyeOff className="h-3 w-3" />Unpublish</>
                ) : (
                  <><Eye className="h-3 w-3" />Publish</>
                )}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Complete React Developer Course"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what students will learn..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. Web Development"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSaveCourse}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isNew ? "Create Course" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {!isNew && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Curriculum
            </h2>

            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
              </div>
            ) : (
              <>
                {course?.modules?.map((mod) => {
                  const expanded = expandedModules.has(mod.id);
                  return (
                    <Card key={mod.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedModules((prev) => {
                                const next = new Set(prev);
                                expanded ? next.delete(mod.id) : next.add(mod.id);
                                return next;
                              })
                            }
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{mod.title}</span>
                            <span className="text-xs text-muted-foreground">
                              ({mod.lessons?.length ?? 0} lessons)
                            </span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                            onClick={() => handleDeleteModule(mod.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardHeader>

                      {expanded && (
                        <CardContent className="pt-0 space-y-2">
                          {mod.lessons?.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {lesson.type}
                                </Badge>
                                <span>{lesson.title}</span>
                                {lesson.duration && (
                                  <span className="text-muted-foreground text-xs">
                                    {lesson.duration}m
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}

                          {addingLessonFor === mod.id ? (
                            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1">
                                  <Label className="text-xs">Lesson Title *</Label>
                                  <Input
                                    placeholder="Lesson title"
                                    value={newLesson.title}
                                    onChange={(e) =>
                                      setNewLesson((p) => ({ ...p, title: e.target.value }))
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Type</Label>
                                  <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    value={newLesson.type}
                                    onChange={(e) =>
                                      setNewLesson((p) => ({
                                        ...p,
                                        type: e.target.value as "text" | "video",
                                      }))
                                    }
                                  >
                                    <option value="text">Text</option>
                                    <option value="video">Video</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Duration (min)</Label>
                                  <Input
                                    type="number"
                                    placeholder="e.g. 15"
                                    value={newLesson.duration}
                                    onChange={(e) =>
                                      setNewLesson((p) => ({ ...p, duration: e.target.value }))
                                    }
                                  />
                                </div>
                                {newLesson.type === "video" ? (
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Video URL</Label>
                                    <Input
                                      placeholder="https://youtube.com/embed/..."
                                      value={newLesson.videoUrl}
                                      onChange={(e) =>
                                        setNewLesson((p) => ({ ...p, videoUrl: e.target.value }))
                                      }
                                    />
                                  </div>
                                ) : (
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Content</Label>
                                    <Textarea
                                      placeholder="Lesson content..."
                                      rows={3}
                                      value={newLesson.content}
                                      onChange={(e) =>
                                        setNewLesson((p) => ({ ...p, content: e.target.value }))
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAddLesson(mod.id)}
                                  disabled={createLessonMutation.isPending}
                                >
                                  {createLessonMutation.isPending ? "Adding..." : "Add Lesson"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setAddingLessonFor(null);
                                    setNewLesson({
                                      title: "",
                                      type: "text",
                                      content: "",
                                      videoUrl: "",
                                      duration: "",
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-1"
                              onClick={() => setAddingLessonFor(mod.id)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Lesson
                            </Button>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}

                <Card className="border-dashed">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="New module title..."
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
                      />
                      <Button
                        onClick={handleAddModule}
                        disabled={!newModuleTitle.trim() || createModuleMutation.isPending}
                        className="shrink-0 gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Module
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

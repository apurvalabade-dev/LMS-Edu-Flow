import { useState } from "react";
import { useListUsers, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { SidebarLayout, AdminSidebar } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const ROLE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  instructor: "secondary",
  student: "outline",
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListUsers(
    {},
    { query: { queryKey: ["admin-users"] } }
  );

  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();

  const users = data?.users ?? [];
  const filtered = users.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number, name: string) => {
    if (id === currentUser?.id) {
      toast({ title: "Cannot delete your own account", variant: "destructive" });
      return;
    }
    if (!confirm(`Delete user "${name}"?`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "User deleted" });
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      }
    );
  };

  const handleRoleChange = (id: number, role: "admin" | "instructor" | "student") => {
    if (id === currentUser?.id) {
      toast({ title: "Cannot change your own role", variant: "destructive" });
      return;
    }
    updateMutation.mutate(
      { id, data: { role } },
      {
        onSuccess: () => {
          toast({ title: "Role updated" });
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  return (
    <SidebarLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">
              {filtered.length} user{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-4 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No users found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <Card key={u.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{u.name}</p>
                      {u.id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={u.role}
                      disabled={u.id === currentUser?.id || updateMutation.isPending}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as "admin" | "instructor" | "student")
                      }
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={u.id === currentUser?.id || deleteMutation.isPending}
                      onClick={() => handleDelete(u.id, u.name)}
                    >
                      <Trash2 className="h-4 w-4" />
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

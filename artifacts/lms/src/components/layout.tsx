import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, BookOpen, LayoutDashboard, Users, Settings, Plus, PlayCircle, Library } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <BookOpen className="h-6 w-6 text-primary" />
              <span>LMS Pro</span>
            </Link>
            
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <Link href="/courses" className={`transition-colors hover:text-foreground/80 ${location === "/courses" ? "text-foreground" : "text-foreground/60"}`}>
                Catalog
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link href={user.role === "admin" ? "/admin-dashboard" : user.role === "instructor" ? "/instructor-dashboard" : "/student-dashboard"}>
                  <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center gap-2 border-l pl-4">
                  <div className="text-sm text-right hidden sm:block">
                    <div className="font-medium leading-none">{user.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">{user.role}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button>Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

export function SidebarLayout({ children, sidebar }: { children: React.ReactNode, sidebar: React.ReactNode }) {
  return (
    <Layout>
      <div className="flex-1 flex container mx-auto px-4 py-8 gap-8 items-start">
        <aside className="hidden md:block w-64 shrink-0 border-r pr-8 min-h-[calc(100vh-8rem)]">
          {sidebar}
        </aside>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </Layout>
  );
}

export function StudentSidebar() {
  const [location] = useLocation();
  
  return (
    <nav className="flex flex-col gap-2 sticky top-24">
      <Link href="/student-dashboard">
        <Button variant={location === "/student-dashboard" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/my-courses">
        <Button variant={location === "/my-courses" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <PlayCircle className="h-4 w-4" />
          My Learning
        </Button>
      </Link>
      <Link href="/courses">
        <Button variant={location === "/courses" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <Library className="h-4 w-4" />
          Browse Catalog
        </Button>
      </Link>
    </nav>
  );
}

export function InstructorSidebar() {
  const [location] = useLocation();
  
  return (
    <nav className="flex flex-col gap-2 sticky top-24">
      <Link href="/instructor-dashboard">
        <Button variant={location === "/instructor-dashboard" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </Button>
      </Link>
      <Link href="/instructor/courses">
        <Button variant={location === "/instructor/courses" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <Library className="h-4 w-4" />
          My Courses
        </Button>
      </Link>
      <Link href="/instructor/courses/new">
        <Button variant={location === "/instructor/courses/new" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          Create Course
        </Button>
      </Link>
    </nav>
  );
}

export function AdminSidebar() {
  const [location] = useLocation();
  
  return (
    <nav className="flex flex-col gap-2 sticky top-24">
      <Link href="/admin-dashboard">
        <Button variant={location === "/admin-dashboard" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/admin/users">
        <Button variant={location.startsWith("/admin/users") ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <Users className="h-4 w-4" />
          Users
        </Button>
      </Link>
      <Link href="/admin/courses">
        <Button variant={location.startsWith("/admin/courses") ? "secondary" : "ghost"} className="w-full justify-start gap-2">
          <Library className="h-4 w-4" />
          Courses
        </Button>
      </Link>
    </nav>
  );
}

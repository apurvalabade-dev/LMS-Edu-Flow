import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Courses from "@/pages/courses";
import CourseDetail from "@/pages/course-detail";
import StudentDashboard from "@/pages/student-dashboard";
import MyCourses from "@/pages/my-courses";
import Learn from "@/pages/learn";
import InstructorDashboard from "@/pages/instructor-dashboard";
import InstructorCourses from "@/pages/instructor-courses";
import InstructorCourseEditor from "@/pages/instructor-course-editor";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminCourses from "@/pages/admin-courses";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function ProtectedRoute({
  component: Component,
  roles,
}: {
  component: React.ComponentType;
  roles?: string[];
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    const redirect =
      user.role === "admin"
        ? "/admin-dashboard"
        : user.role === "instructor"
          ? "/instructor-dashboard"
          : "/student-dashboard";
    setLocation(redirect);
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:id" component={CourseDetail} />

      <Route path="/student-dashboard">
        {() => <ProtectedRoute component={StudentDashboard} roles={["student"]} />}
      </Route>
      <Route path="/my-courses">
        {() => <ProtectedRoute component={MyCourses} roles={["student"]} />}
      </Route>
      <Route path="/learn/:courseId/lessons/:lessonId">
        {() => <ProtectedRoute component={Learn} roles={["student", "instructor", "admin"]} />}
      </Route>

      <Route path="/instructor-dashboard">
        {() => <ProtectedRoute component={InstructorDashboard} roles={["instructor"]} />}
      </Route>
      <Route path="/instructor/courses">
        {() => <ProtectedRoute component={InstructorCourses} roles={["instructor"]} />}
      </Route>
      <Route path="/instructor/courses/new">
        {() => <ProtectedRoute component={InstructorCourseEditor} roles={["instructor"]} />}
      </Route>
      <Route path="/instructor/courses/:id/edit">
        {() => <ProtectedRoute component={InstructorCourseEditor} roles={["instructor"]} />}
      </Route>

      <Route path="/admin-dashboard">
        {() => <ProtectedRoute component={AdminDashboard} roles={["admin"]} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} roles={["admin"]} />}
      </Route>
      <Route path="/admin/courses">
        {() => <ProtectedRoute component={AdminCourses} roles={["admin"]} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

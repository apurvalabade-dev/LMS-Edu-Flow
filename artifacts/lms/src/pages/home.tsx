import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Award, TrendingUp, Play, ChevronRight } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const dashboardPath =
    user?.role === "admin"
      ? "/admin-dashboard"
      : user?.role === "instructor"
        ? "/instructor-dashboard"
        : "/student-dashboard";

  return (
    <Layout>
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-24 px-4">
        <div className="container mx-auto max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <Award className="h-4 w-4 text-primary" />
            Learn at your own pace
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Master New Skills with{" "}
            <span className="text-primary">LMS Pro</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Access world-class courses taught by expert instructors. Whether you're learning to code,
            design, or lead teams — we have the course for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href={dashboardPath}>
                <Button size="lg" className="gap-2 px-8">
                  <TrendingUp className="h-5 w-5" />
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg" className="gap-2 px-8">
                    Get Started Free
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="gap-2 px-8">
                    <Play className="h-4 w-4" />
                    Browse Courses
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-t bg-muted/20">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Active Courses", value: "50+", icon: BookOpen },
              { label: "Students", value: "10K+", icon: Users },
              { label: "Expert Instructors", value: "25+", icon: Award },
              { label: "Completion Rate", value: "94%", icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="space-y-2">
                <Icon className="h-8 w-8 text-primary mx-auto" />
                <div className="text-3xl font-bold">{value}</div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Why Choose LMS Pro?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to learn, teach, and grow — all in one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Play,
                title: "Video & Text Lessons",
                description: "Rich multimedia content including HD videos and interactive reading material to suit every learning style.",
              },
              {
                icon: Award,
                title: "Quizzes & Assessments",
                description: "Reinforce your knowledge with quizzes, instant feedback, and track your progress through every module.",
              },
              {
                icon: TrendingUp,
                title: "Progress Tracking",
                description: "Visualize your learning journey with detailed progress dashboards and completion milestones.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-0 shadow-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/20 border-t">
        <div className="container mx-auto max-w-2xl text-center space-y-8">
          <h2 className="text-3xl font-bold">Ready to start learning?</h2>
          <p className="text-muted-foreground">
            Join thousands of learners and start your journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/courses">
              <Button size="lg" variant="outline">
                Browse Catalog
              </Button>
            </Link>
            {!user && (
              <Link href="/register">
                <Button size="lg">Create Free Account</Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}

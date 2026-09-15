import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useRegister, RegisterInputRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterInputRole>("student");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    registerMutation.mutate({
      data: { name, email, password, role }
    }, {
      onSuccess: (data) => {
        login(data.token, data.user);
        toast({ title: "Account created!" });
        if (data.user.role === "admin") setLocation("/admin-dashboard");
        else if (data.user.role === "instructor") setLocation("/instructor-dashboard");
        else setLocation("/student-dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Registration failed",
          description: err.message || "An error occurred.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Join our learning platform today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (min 8 characters)</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div className="space-y-3 pt-2">
              <Label>I want to...</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as RegisterInputRole)} className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setRole("student")}>
                  <RadioGroupItem value="student" id="role-student" />
                  <Label htmlFor="role-student" className="flex-1 cursor-pointer">Learn new skills</Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50" onClick={() => setRole("instructor")}>
                  <RadioGroupItem value="instructor" id="role-instructor" />
                  <Label htmlFor="role-instructor" className="flex-1 cursor-pointer">Teach others</Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
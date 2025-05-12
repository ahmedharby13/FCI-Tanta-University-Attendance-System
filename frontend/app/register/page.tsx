"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, UserPlus, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define the allowed role types
type Role = "admin" | "instructor" | "student";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role | undefined>(undefined);

  // Student-specific fields
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const router = useRouter();

  // Check if user is authorized (admin)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedRole = localStorage.getItem("role");

        // Clean up stored role value by removing quotes if present
        const userRole = storedRole?.replace(/"/g, "");

        if (!token) {
          setIsAuthorized(false);
        } else if (userRole === "admin") {
          setIsAuthorized(true);
        } else {
          // Verify with API if needed
          try {
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/me`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (response.data?.data?.role === "admin") {
              setIsAuthorized(true);
            } else {
              setIsAuthorized(false);
              router.replace("/");
            }
          } catch (err) {
            setIsAuthorized(false);
            router.replace("/");
          }
        }
      } catch (err) {
        setIsAuthorized(false);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, [router]);

  const validateForm = () => {
    // Reset the error before validation
    setError(null);

    // Basic validation for all roles
    if (!name.trim()) {
      setError("Name is required");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!role) {
      setError("Please select a role");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return false;
    }

    // Student-specific validation
    if (role === "student") {
      if (!studentId.trim()) {
        setError("Student ID is required");
        return false;
      }
      if (!department.trim()) {
        setError("Department is required");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) return;

    setError(null);
    setIsLoading(true);

    // Create a base user data object
    const userData: any = {
      name,
      email,
      password,
      role,
    };

    // Add student-specific fields when role is student
    if (role === "student") {
      userData.studentId = studentId;
      userData.department = department;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/register`,
        userData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.status === 200 || response.status === 201) {
        toast.success(
          `${role?.charAt(0).toUpperCase() + role?.slice(1)} registered successfully!`,
        );

        // Reset form
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setRole(undefined);
        setStudentId("");
        setDepartment("");
      } else {
        const errorData = response.data;
        setError(
          errorData?.message || `Registration failed. Please try again.`,
        );
      }
    } catch (err: any) {
      // console.error("Registration request failed:", err);
      let errorMessage =
        "An unexpected error occurred. Please try again later.";

      if (axios.isAxiosError(err) && err.response) {
        // console.error("Error response data:", err.response.data);

        // Handle specific error cases
        if (err.response.status === 409) {
          errorMessage =
            "This email is already registered. Please use a different email.";
        } else if (err.response.status === 400) {
          errorMessage =
            err.response.data?.message ||
            "Invalid data provided. Please check your information.";
        } else if (err.response.status === 401 || err.response.status === 403) {
          errorMessage = "You are not authorized to register users.";
        } else {
          errorMessage =
            err.response.data?.message ||
            `Request failed with status ${err.response.status}`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while initializing auth check
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Unauthorized access
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6 text-center">
          You do not have permission to access this page. Only administrators
          can register new users.
        </p>
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 bg-dot-pattern">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-3 rounded-full">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Register a new user in the system
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  Role
                </Label>
                <Select
                  value={role}
                  onValueChange={(value: Role) => setRole(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="role" className="bg-background">
                    <SelectValue placeholder="Select user role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="bg-background"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-background"
                  autoComplete="email"
                />
              </div>

              {/* Student-specific fields */}
              {role === "student" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="studentId" className="text-sm font-medium">
                      Student ID
                    </Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="Enter student ID"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department
                    </Label>
                    <Input
                      id="department"
                      type="text"
                      placeholder="Enter department"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-background"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSubmit();
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  `Register ${role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}`
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Want to go back?{" "}
                <Link
                  href="/"
                  className="font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline"
                >
                  Return to Dashboard
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

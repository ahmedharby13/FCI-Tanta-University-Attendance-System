import { cn } from "@/lib/utils";
import {
  BookOpen,
  ChevronsLeftIcon,
  MenuIcon,
  Scan,
  School,
  Search,
  Settings,
  User,
  PlusCircle,
  ChevronDown,
  AlertCircle,
  Users,
  WifiIcon,
  CalendarCheck2,
  BookCheck,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, {
  ComponentRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "usehooks-ts";
import { SidebarItem } from "./sidebar-item";
import Link from "next/link";
import LoginButton from "@/components/login-button";
import { ModeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Import CreateClassModal
import { CreateClassModal } from "../(routes)/classes/_components/create-class-modal";
import { Button } from "@/components/ui/button";

// Define interfaces
interface ClassData {
  _id: string;
  name: string;
  teacherId: string;
  semester: string;
  status: string;
  students: any[];
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "instructor";
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isResizingRef = useRef(false);
  const sidebarRef = useRef<ComponentRef<"aside">>(null);
  const navbarRef = useRef<ComponentRef<"div">>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  // User authentication states
  const [role, setRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Classes states
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [classesOpen, setClassesOpen] = useState(true);

  // Modal state for creating class
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Extract user data on component mount
  useEffect(() => {
    const getUserData = async () => {
      setIsLoadingUser(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUserData(null);
          setRole(null);
          return;
        }

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const user = response.data.data;
        setUserData(user);
        setRole(user.role);

        // Store role in localStorage
        localStorage.setItem("role", user.role);

        // If user is logged in, fetch their classes
        if (
          user &&
          (user.role === "admin" ||
            user.role === "instructor" ||
            user.role === "student")
        ) {
          fetchClasses();
        }
      } catch (err) {
        // console.error("Failed to fetch user data:", err);
        setUserData(null);
        setRole(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    getUserData();

    const handleStorageChange = () => {
      const storedRole = localStorage.getItem("role");
      setRole(storedRole);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch classes function
  const fetchClasses = async () => {
    setIsLoadingClasses(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setClasses([]);
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/class/my-classes`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setClasses(response.data.data || []);
    } catch (err) {
      // console.error("Failed to fetch classes for navigation:", err);
      setClasses([]);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  useEffect(() => {
    if (isMobile) {
      collapse();
    } else {
      resetWidth();
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      collapse();
    }
  }, [pathname, isMobile]);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    isResizingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizingRef.current) return;
    let newWidth = event.clientX;
    // control the width of the sidebar
    if (newWidth < 240) newWidth = 0;
    if (newWidth > 480) newWidth = 480;
    setIsCollapsed(true);

    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`;
      navbarRef.current.style.setProperty("left", `${newWidth}px`);
      navbarRef.current.style.setProperty(
        "width",
        `calc(100% - ${newWidth}px)`,
      );
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const resetWidth = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(false);
      setIsResetting(true);
      sidebarRef.current.style.width = isMobile ? "100%" : "240px";
      navbarRef.current.style.setProperty(
        "width",
        isMobile ? "0" : "calc(100% - 240px)",
      );
      navbarRef.current.style.setProperty("left", isMobile ? "0" : "240px");
      setTimeout(() => {
        setIsResetting(false);
      }, 300);
    }
  };
  const [error, setError] = useState<string | null>(null);
  // --- Fetching Logic (mostly unchanged) ---
  const getAllClasses = useCallback(async (showLoading = true) => {
    // ... (keep existing getAllClasses logic)
    if (showLoading) setIsLoadingClasses(true);
    // setError(null); // Clear previous *page level* errors related to fetching classes
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setClasses([]);
        return;
      }
      const response = await axios.get<{ data: ClassData[] }>(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/class/my-classes`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setClasses(response.data.data || []);
    } catch (err: any) {
      // console.error("Failed to fetch classes:", err);
      let errorMessage = "Failed to load classes.";
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        errorMessage = "Your session might have expired. Please log in again.";
      } else if (axios.isAxiosError(err) && err.response) {
        errorMessage =
          err.response.data?.message || `Error ${err.response.status}`;
      } else if (axios.isAxiosError(err) && err.request) {
        errorMessage = "Network error fetching classes.";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage); // Set page-level error
      toast.error(errorMessage);
      setClasses([]);
    } finally {
      if (showLoading) setIsLoadingClasses(false);
    }
  }, []);
  const collapse = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(true);
      setIsResetting(true);
      sidebarRef.current.style.width = "0";
      navbarRef.current.style.setProperty("width", "100%");
      navbarRef.current.style.setProperty("left", "0");
      setTimeout(() => setIsResetting(false), 300);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUserData(null);
    setRole(null);
    setClasses([]);
    router.push("/login");
    toast.success("Logged out successfully");
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "group/sidebar h-full bg-secondary/50 backdrop-blur-sm border-r overflow-y-auto relative flex w-60 flex-col z-10 shadow-sm",
          isMobile && "w-0",
          isResetting && "transition-all duration-300 ease-in-out",
          isCollapsed && "transition-all duration-300 ease-in-out",
        )}
      >
        <div
          role="button"
          onClick={collapse}
          className={cn(
            "h-6 w-6 text-muted-foreground rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600 absolute top-3 right-2 opacity-0 group-hover/sidebar:opacity-100 transition",
            isMobile && "opacity-100",
          )}
        >
          <ChevronsLeftIcon className="h-6 w-6" />
        </div>

        {/* Header */}
        <div className="px-3 py-6 flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center rounded-md border p-2 shadow-sm bg-background w-12 h-12">
            <School className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            Student Management
          </h1>
          <div className="flex justify-center w-full px-2">
            <ModeToggle />
          </div>
        </div>

        <Separator className="my-2" />

        {/* Navigation items */}
        <div className="flex-1 px-3 py-2">
          <div className="space-y-1">
            {/* Classes main menu item for instructors and admins */}
            {(role === '"instructor"' || role === '"admin"') && (
              <Link href="/classes" className="block">
                <SidebarItem
                  label="Classes"
                  icon={School}
                  className={cn(
                    "transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === "/classes" &&
                      "bg-accent text-accent-foreground",
                  )}
                />
              </Link>
            )}

            {/* Classes dropdown list */}
            {(role === "instructor" || role === "admin") && (
              <Collapsible
                open={classesOpen}
                onOpenChange={setClassesOpen}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md cursor-pointer",
                      "transition-colors hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="truncate">My Classes</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        classesOpen && "transform rotate-180",
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-6 mt-1">
                  {isLoadingClasses ? (
                    <>
                      <Skeleton className="h-6 w-full rounded my-1" />
                      <Skeleton className="h-6 w-full rounded my-1" />
                      <Skeleton className="h-6 w-full rounded my-1" />
                    </>
                  ) : classes.length === 0 ? (
                    <div className="text-xs text-muted-foreground pl-2 py-1">
                      No classes available
                    </div>
                  ) : (
                    classes.map((classItem) => (
                      <Link
                        href={`/classes/${classItem._id}`}
                        key={classItem._id}
                        className="block"
                      >
                        <div
                          className={cn(
                            "flex items-center p-2 text-sm rounded-md",
                            "transition-colors hover:bg-accent hover:text-accent-foreground",
                            pathname === `/classes/${classItem._id}` &&
                              "bg-accent/50 text-accent-foreground",
                          )}
                        >
                          <span className="truncate">{classItem.name}</span>
                          {classItem.status === "active" ? (
                            <Badge
                              variant="default"
                              className="ml-auto text-[10px] h-4 px-1"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-[10px] h-4 px-1"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))
                  )}

                  {/* Create new class button for admin/instructor */}
                  {(role === "admin" || role === "instructor") && (
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex items-center cursor-pointer gap-1 p-2 text-sm rounded-md w-full justify-start",
                        "transition-colors hover:bg-accent/50 text-muted-foreground hover:text-accent-foreground",
                      )}
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span className="truncate">New Class</span>
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
            {(role === "admin" || role === "instructor") && (
              <Link href="/comming-soon" className="block">
                <SidebarItem
                  label="GPA"
                  icon={BookCheck}
                  className={cn(
                    "transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === "/register" &&
                      "bg-accent text-accent-foreground",
                  )}
                />
              </Link>
            )}
            {(role === "admin" || role === "instructor") && (
              <Link href="/comming-soon" className="block">
                <SidebarItem
                  label="Course Schadule"
                  icon={CalendarCheck2}
                  className={cn(
                    "transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === "/register" &&
                      "bg-accent text-accent-foreground",
                  )}
                />
              </Link>
            )}
            {/* Student specific navigation items */}
            {(role === "student" || role === '"student"') && (
              <>
                <Link href="/scan" className="block">
                  <SidebarItem
                    label="Scan QR Code"
                    icon={Scan}
                    className={cn(
                      "transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === "/scan" &&
                        "bg-accent text-accent-foreground",
                    )}
                  />
                </Link>
                <Link href="/student-attendance" className="block">
                  <SidebarItem
                    label="Attendance"
                    icon={AlertCircle}
                    className={cn(
                      "transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === "/student-attendance" &&
                        "bg-accent text-accent-foreground",
                    )}
                  />
                </Link>
              </>
            )}

            {role === "admin" && (
              <Link href="/register" className="block">
                <SidebarItem
                  label="Add Users"
                  icon={Users}
                  className={cn(
                    "transition-colors hover:bg-accent hover:text-accent-foreground",
                    pathname === "/register" &&
                      "bg-accent text-accent-foreground",
                  )}
                />
              </Link>
            )}
          </div>
        </div>

        {/* User section */}
        <div className="mt-auto border-t py-4 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                {/* <AvatarImage src="/avatar.png" alt="User" /> */}
                <AvatarFallback>
                  {userData?.name ? (
                    userData.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm">
                {isLoadingUser ? (
                  <Skeleton className="h-4 w-24" />
                ) : userData ? (
                  <div>
                    <p className="font-medium">{userData.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {role?.replace(/"/g, "")}
                    </p>
                  </div>
                ) : (
                  <p className="font-medium">Guest</p>
                )}
              </div>
            </div>
            {userData ? (
              <LoginButton variant="ghost" size="sm" onClick={handleLogout} />
            ) : (
              <LoginButton
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
              />
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={resetWidth}
          className="opacity-0 group-hover/sidebar:opacity-100 transition cursor-ew-resize absolute h-full w-1 bg-primary/10 right-0 top-0"
        />
      </aside>

      {/* Main content area */}
      <div
        ref={navbarRef}
        className={cn(
          "absolute top-0 left-60 w-[calc(100%-240px)]",
          isResetting && "transition-all ease-in-out duration-300",
          isMobile && "left-0 w-full",
        )}
      >
        <nav className="bg-background/50 z-[500] backdrop-blur-sm px-3 py-2 w-full border-b flex items-center h-14 z[100]">
          {isCollapsed && (
            <MenuIcon
              onClick={resetWidth}
              role="button"
              className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
            />
          )}
          <div className="ml-4 font-medium">
            {/* Dynamic page title */}
            {pathname === "/classes"
              ? "Classes"
              : pathname === "/scan"
                ? "Scan QR Code"
                : pathname === "/student-attendance"
                  ? "Attendance"
                  : pathname.startsWith("/classes/")
                    ? "Class Details"
                    : "Dashboard"}
          </div>
        </nav>
      </div>

      {/* CreateClassModal - available for admin/instructor */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onClassCreated={() => fetchClasses()} // Refresh classes in sidebar after creation
        teacherId={userData?._id ?? null}
      />
    </>
  );
}

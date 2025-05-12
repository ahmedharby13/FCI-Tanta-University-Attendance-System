import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  BookOpen,
  CalendarDays,
  TrashIcon,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

// Define the structure of a student
interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
}

// Define the props for the ClassCard
interface ClassCardProps {
  classData: {
    _id: string;
    name: string;
    teacherId: string;
    semester: string;
    status: string;
    students: Student[];
    createdAt: string;
    updatedAt: string;
    sectionCount: number;
  };
  userData: {
    _id: string;
    role: "student" | "admin" | "instructor";
  } | null;
  onClick?: () => void;
  onDelete: (classId: string, className: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  classData,
  userData,
  onClick,
  onDelete,
}) => {
  const studentCount = classData.students?.length || 0;
  const router = useRouter();

  // Determine badge variant based on status
  const getStatusVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(classData._id, classData.name);
  };

  // Determine if the current user can delete this class
  const canDelete = userData && userData.role === "admin";

  // Format date for display (assuming createdAt is ISO string)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "group flex flex-col h-full overflow-hidden relative transition-all duration-300",
          "bg-background border-border hover:border-primary/20",
          "hover:shadow-lg hover:shadow-primary/5",
          onClick ? "cursor-pointer" : "",
        )}
        onClick={onClick}
      >
        {/* Status Badge - Top left corner for immediate visibility */}
        <Badge
          variant={getStatusVariant(classData.status)}
          className="capitalize text-xs absolute top-3 left-3 z-10"
        >
          {classData.status}
        </Badge>

        {/* Delete Button - Positioned in absolute top-right */}
        {canDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDeleteClick}
                aria-label={`Delete class ${classData.name}`}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete class</p>
            </TooltipContent>
          </Tooltip>
        )}

        <CardHeader className="pt-10 pb-3">
          <CardTitle
            className="text-xl font-semibold truncate pr-8 leading-tight"
            title={classData.name}
          >
            {classData.name}
          </CardTitle>
          <CardDescription className="flex items-center mt-2 text-sm">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            {classData.semester}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-grow space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col space-y-1 bg-muted/30 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Students</div>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium">{studentCount}</span>
              </div>
            </div>

            <div className="flex flex-col space-y-1 bg-muted/30 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Sections</div>
              <div className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4 text-primary" />
                <span className="font-medium">{classData.sectionCount}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center">
            <span>Created: {formatDate(classData.createdAt)}</span>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between gap-2 border-t p-4 bg-muted/10">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/classes/${classData._id}`);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Explore</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="flex-1 flex items-center justify-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/classes/${classData._id}/attendance`);
              localStorage.setItem("className", classData.name);
            }}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Attendance</span>
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
};

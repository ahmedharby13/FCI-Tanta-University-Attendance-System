import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Users, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import SectionStudentsModal from "./section-students-modal";
import DeleteSectionDialog from "./delete-section-dialog";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
}

interface Section {
  _id: string;
  classId: string;
  sectionNumber: string;
  students: Student[];
  createdAt: string;
}

interface SectionCardProps {
  section: Section;
  classId: string;
  canManage: boolean;
  onDelete: (sectionId: string) => Promise<void>;
  classData: any;
}

export default function SectionCard({
  section,
  classId,
  canManage,
  onDelete,
  classData,
}: SectionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(section._id);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-md border-border hover:border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0 font-medium py-1.5">
              {section.sectionNumber}
            </Badge>

            {canManage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete section</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-grow flex flex-col justify-center py-6">
          <div className="flex items-center justify-center">
            <div className="bg-muted/50 p-4 rounded-full">
              <Users className="h-7 w-7 text-primary" />
            </div>
          </div>

          <div className="text-center mt-4">
            <div className="text-2xl font-bold">
              {section.students?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Student{section.students?.length !== 1 ? "s" : ""} Enrolled
            </div>
          </div>

          <div className="mt-4 text-xs text-center text-muted-foreground">
            Created: {formatDate(section.createdAt)}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-center gap-2 border-t bg-muted/10 p-3 ">
          <Button
            onClick={() =>
              router.push(`/classes/${classId}/section/${section._id}`)
            }
            variant="default"
            size="sm"
            className="flex items-center justify-center w-3/4"
          >
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            <span>Manage</span>
          </Button>
        </CardFooter>
      </Card>

      {/* Section students modal */}
      <SectionStudentsModal
        isOpen={isStudentsModalOpen}
        onOpenChange={setIsStudentsModalOpen}
        section={section}
        classId={classId}
        classData={classData}
        canManage={canManage}
      />

      {/* Delete section confirmation dialog */}
      <DeleteSectionDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        sectionNumber={section.sectionNumber}
        isDeleting={isDeleting}
      />
    </TooltipProvider>
  );
}

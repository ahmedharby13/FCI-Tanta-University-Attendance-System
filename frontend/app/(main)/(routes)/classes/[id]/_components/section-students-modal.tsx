import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // Make sure you have this utility
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
}

interface Section {
  _id: string;
  classId: string;
  sectionNumber: number;
  dayNumber: number;
  students: Student[];
  createdAt: string;
}

interface ClassData {
  _id: string;
  name: string;
  students: Student[];
  // other class properties as needed
}

interface SectionStudentsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  section: Section;
  classId: string;
  classData: ClassData;
  canManage: boolean;
}

export default function SectionStudentsModal({
  isOpen,
  onOpenChange,
  section,
  classId,
  classData,
  canManage,
}: SectionStudentsModalProps) {
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [sectionStudents, setSectionStudents] = useState<Student[]>(
    section.students || [],
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null,
  );
  const [open, setOpen] = useState(false);

  // Filter available students when the modal opens
  useEffect(() => {
    if (isOpen) {
      filterAvailableStudents();
      // Update section students from the section prop
      setSectionStudents(section.students || []);
    }
  }, [isOpen, section, classData]);

  // Filter students who are in the class but not in this section
  const filterAvailableStudents = () => {
    setIsLoading(true);
    try {
      if (!classData || !classData.students) {
        toast.error("Class data not available");
        return;
      }

      // Create a set of student IDs already in this section for fast lookup
      const sectionStudentIds = new Set(
        section.students?.map((s) => s._id) || [],
      );

      // Filter to only include students who are in the class but not in this section
      const available = classData.students.filter(
        (student) => !sectionStudentIds.has(student._id),
      );

      setAvailableStudents(available);
    } catch (error) {
      toast.error("Failed to load available students");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (selectedStudentIds.length === 0) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/add-students`,
        {
          sectionId: section._id,
          studentIds: selectedStudentIds,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Find the added students from availableStudents and add to sectionStudents
      const addedStudents = availableStudents.filter((s) =>
        selectedStudentIds.includes(s._id),
      );
      if (addedStudents.length > 0) {
        setSectionStudents((prev) => [...prev, ...addedStudents]);
        // Remove the students from available students
        setAvailableStudents((prev) =>
          prev.filter((s) => !selectedStudentIds.includes(s._id)),
        );
      }

      // Reset selection
      setSelectedStudentIds([]);
      setOpen(false);

      toast.success(`${addedStudents.length} student(s) added to section`);
    } catch (error) {
      // console.error('Failed to add student to section', error);
      toast.error("Failed to add student to section");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    setRemovingStudentId(studentId);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/remove-students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: {
            sectionId: section._id,
            studentIds: [studentId],
          },
        },
      );

      // Find the removed student and add it back to available students
      const removedStudent = sectionStudents.find((s) => s._id === studentId);
      if (removedStudent) {
        setAvailableStudents((prev) => [...prev, removedStudent]);
        // Remove from section students
        setSectionStudents((prev) => prev.filter((s) => s._id !== studentId));
      }

      toast.success("Student removed from section");
    } catch (error) {
      // console.error('Failed to remove student from section', error);
      toast.error("Failed to remove student from section");
    } finally {
      setRemovingStudentId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Section {section.sectionNumber} Students</DialogTitle>
          <DialogDescription>Manage students in this section</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Student selector and add button - only for admins/instructors */}
          {canManage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-[350px] justify-between"
                    disabled={
                      isLoading || isUpdating || availableStudents.length === 0
                    }
                  >
                    {isLoading
                      ? "Loading students..."
                      : selectedStudentIds.length > 0
                        ? `${selectedStudentIds.length} student(s) selected`
                        : availableStudents.length === 0
                          ? "No students available"
                          : "Select students"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search student..." />
                    <CommandList className="max-h-[300px] overflow-auto">
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        <div className="flex items-center justify-between px-2 py-1.5 border-b">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() =>
                              setSelectedStudentIds(
                                availableStudents.map((s) => s._id),
                              )
                            }
                            disabled={availableStudents.length === 0}
                          >
                            Select All
                          </Button>
                          {selectedStudentIds.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => setSelectedStudentIds([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        {availableStudents.map((student) => (
                          <CommandItem
                            key={student._id}
                            value={`${student.name} ${student.studentId}`}
                            onSelect={() => {
                              setSelectedStudentIds((prev) =>
                                prev.includes(student._id)
                                  ? prev.filter((id) => id !== student._id)
                                  : [...prev, student._id],
                              );
                              // Keep the popover open for multi-selection
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStudentIds.includes(student._id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{student.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {student.studentId}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                onClick={handleAddStudent}
                disabled={
                  selectedStudentIds.length === 0 || isUpdating || isLoading
                }
                className="w-full sm:w-auto"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add{" "}
                {selectedStudentIds.length > 0
                  ? `${selectedStudentIds.length} Student(s)`
                  : ""}{" "}
                to Section
              </Button>
            </div>
          )}

          {/* Students table */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="medium" />
            </div>
          ) : sectionStudents.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Email
                    </TableHead>
                    {canManage && (
                      <TableHead className="w-[80px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionStudents.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {student.email}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveStudent(student._id)}
                            disabled={removingStudentId === student._id}
                          >
                            {removingStudentId === student._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">
                No students in this section yet.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

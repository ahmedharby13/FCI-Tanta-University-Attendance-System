import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
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
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/spinner";

interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
}

interface ClassData {
  _id: string;
  name: string;
  students: Student[];
  // other properties
}

interface AddStudentFormProps {
  classData: ClassData;
  onAddStudent: (studentIds: string[]) => Promise<void>;
}

export default function AddStudentForm({
  classData,
  onAddStudent,
}: AddStudentFormProps) {
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchAvailableStudents();
  }, []);

  const fetchAvailableStudents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Filter out students already in this class
      const classStudentIds = new Set(
        classData.students?.map((s) => s._id) || [],
      );
      const available = response.data.data.filter(
        (student: Student) => !classStudentIds.has(student._id),
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

    setIsAdding(true);
    try {
      await onAddStudent(selectedStudentIds);

      // Reset selection
      setSelectedStudentIds([]);
      setOpen(false);

      // Refresh available students
      fetchAvailableStudents();
    } catch (error) {
    } finally {
      setIsAdding(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const selectAllStudents = () => {
    const allStudentIds = availableStudents.map((student) => student._id);
    setSelectedStudentIds(allStudentIds);
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex justify-between items-center">
          Add Student to Class
          <Badge variant="outline" className="ml-2">
            {availableStudents.length} available
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {isLoading ? (
            <div className="flex items-center space-x-2 w-full">
              <Button variant="outline" className="w-full" disabled>
                <Spinner size="small" className="mr-2" />
                Loading students...
              </Button>
            </div>
          ) : (
            <>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-[350px] justify-between"
                    disabled={isAdding || availableStudents.length === 0}
                  >
                    {selectedStudentIds.length > 0
                      ? `${selectedStudentIds.length} student${selectedStudentIds.length > 1 ? "s" : ""} selected`
                      : availableStudents.length === 0
                        ? "No students available"
                        : "Select students to add"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <div className="flex items-center justify-between p-2 border-b">
                      <CommandInput placeholder="Search student..." />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAllStudents}
                          disabled={availableStudents.length === 0}
                          className="h-7 px-2 text-xs"
                        >
                          Select All
                        </Button>
                        {selectedStudentIds.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearSelection}
                            className="h-7 px-2 text-xs"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <CommandList className="max-h-[300px] overflow-auto">
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {availableStudents.map((student) => (
                          <CommandItem
                            key={student._id}
                            value={`${student.name} ${student.studentId}`}
                            onSelect={() => {
                              toggleStudentSelection(student._id);
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
                disabled={selectedStudentIds.length === 0 || isAdding}
                className="w-full sm:w-auto"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add{" "}
                {selectedStudentIds.length > 0
                  ? `${selectedStudentIds.length} Student${selectedStudentIds.length > 1 ? "s" : ""}`
                  : "to Class"}
              </Button>
            </>
          )}
        </div>
        {availableStudents.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground mt-2">
            All registered students have already been added to this class.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

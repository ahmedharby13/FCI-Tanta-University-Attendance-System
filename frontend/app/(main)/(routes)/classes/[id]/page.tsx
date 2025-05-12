"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { BarChart3, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/spinner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Import components
import StudentsGrid from "./_components/students-grid";
import AddStudentForm from "./_components/add-student-form";
import SectionCard from "./_components/section-card";
import { CreateSectionModal } from "./_components/create-section-modal";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

// Define interfaces
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
  teacherId: string;
  semester: string;
  status: string;
  students: Student[];
  sectionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  _id: string;
  name: string;
  role: "student" | "admin" | "instructor";
}

export default function ClassDetailPage() {
  // Get id from router params
  const params = useParams();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingClass, setIsLoadingClass] = useState(true);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isCreatingSectionModalOpen, setIsCreatingSectionModalOpen] =
    useState(false);
  const router = useRouter();
  // Permissions check
  const canManage =
    userData &&
    (userData.role === "admin" ||
      (userData.role === "instructor" &&
        classData?.teacherId === userData._id));

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setUserData(response.data.data);
    } catch (error) {
      // console.error('Failed to fetch user data', error);
    }
  }, []);

  // Fetch class data
  const fetchClassData = useCallback(async () => {
    setIsLoadingClass(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/class/my-classes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const currentClass = response.data.data.find(
        (c: ClassData) => c._id === classId,
      );
      if (currentClass) {
        setClassData(currentClass);
      } else {
        toast.error("Class not found");
      }
    } catch (error) {
      // console.error('Failed to fetch class data', error);
      toast.error("Failed to load class details");
    } finally {
      setIsLoadingClass(false);
    }
  }, [classId]);

  // Fetch sections
  const fetchSections = useCallback(async () => {
    setIsLoadingSections(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/my-sections`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Filter sections by the current classId
      const filteredSections = response.data.data.filter(
        (section: Section) => section.classId === classId,
      );

      setSections(filteredSections || []);
    } catch (error) {
      // console.error('Failed to fetch sections', error);
      toast.error("Failed to load class sections");
    } finally {
      setIsLoadingSections(false);
    }
  }, [classId]);

  // Add student to class
  const handleAddStudent = async (studentIds: string[]) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/class/add-students`,
        {
          classId,
          studentIds,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("Student(s) added successfully");
      fetchClassData(); // Refresh class data to update the students list
    } catch (error) {
      // console.error('Failed to add student', error);
      toast.error("Failed to add student to class");
    }
  };

  // Remove student from class
  const handleRemoveStudent = async (studentId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/class/remove-students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          data: {
            classId,
            studentIds: [studentId],
          },
        },
      );

      toast.success("Student removed successfully");
      fetchClassData(); // Refresh class data
    } catch (error) {
      // console.error('Failed to remove student', error);
      toast.error("Failed to remove student from class");
    }
  };
  const handleCreateSection = async (
    sectionNumber: number,
    dayNumber: number,
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      // Ensure classId is available in this scope.
      // If handleCreateSection is defined in the parent component,
      // classId should be accessible from props or state.
      if (!classId) {
        toast.error("Class ID is missing.");
        // console.error('handleCreateSection called without a valid classId.');
        return;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/create`,
        {
          classId, // Make sure this variable holds the correct class ID
          sectionNumber,
          dayNumber,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success("Section created successfully");
      fetchSections(); // Refresh sections list - ensure this function is in scope
      fetchClassData(); // Update class data (e.g., section count) - ensure this function is in scope
    } catch (error) {
      // console.error('Failed to create section', error);
      // Log more specific error details if available (e.g., from Axios response)
      let errorMessage = "Failed to create section";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = `Failed to create section: ${error.response.data?.message || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Failed to create section: ${error.message}`;
      }
      toast.error(errorMessage);
    }
  };

  // Delete a section
  const handleDeleteSection = async (sectionId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found");
        return;
      }

      await axios.delete(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/delete`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: {
            sectionId: sectionId,
          },
        },
      );

      toast.success("Section deleted successfully");
      fetchSections(); // Refresh sections
      fetchClassData(); // Update section count
    } catch (error) {
      // console.error('Failed to delete section', error);
      toast.error("Failed to delete section");
    }
  };

  // Load data on page load
  useEffect(() => {
    fetchUserData();
    fetchClassData();
    fetchSections();
  }, [fetchUserData, fetchClassData, fetchSections]);

  // Loading state
  if (isLoadingClass) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Class not found
  if (!classData) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
        <p className="text-xl text-muted-foreground">Class not found</p>
        <Button asChild className="mt-4">
          <Link href="/classes">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Classes
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      {/* Header with back button and class info */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/classes">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold">{classData.name}</h1>
            <p className="text-white font-bold text-xl">
              Semester: {classData.semester}
            </p>
          </div>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/classes/${classId}/attendance`);
          }}
          variant="outline"
          className="hidden lg:flex"
        >
          <BarChart3 className="mr-2 h-4 w-4" /> Attendance
        </Button>
        {canManage && (
          <Button onClick={() => setIsCreatingSectionModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Section
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Students</CardTitle>
            <CardDescription>Students enrolled in this class</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{classData.students.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Sections</CardTitle>
            <CardDescription>Sections in this class</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{classData.sectionCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Status</CardTitle>
            <CardDescription>Current class status</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              variant={classData.status === "active" ? "default" : "secondary"}
              className="text-sm capitalize"
            >
              {classData.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Sections</h2>

        {isLoadingSections ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : sections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => (
              <SectionCard
                key={section._id}
                section={section}
                classId={classId}
                canManage={!!canManage}
                classData={classData}
                onDelete={handleDeleteSection}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">
              No sections have been created yet.
            </p>
            {canManage && (
              <Button
                className="mt-4"
                onClick={() => setIsCreatingSectionModalOpen(true)}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" /> Create First Section
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {/* Students Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Students</h2>

        {/* Add Student Form - only visible to instructors/admins who can manage */}
        {canManage && (
          <AddStudentForm
            classData={classData}
            onAddStudent={handleAddStudent}
          />
        )}

        {/* Students Grid */}
        <StudentsGrid
          students={classData.students}
          canManage={!!canManage}
          onRemoveStudent={handleRemoveStudent}
        />
      </div>

      {/* Modals */}
      <CreateSectionModal
        isOpen={isCreatingSectionModalOpen}
        onOpenChange={setIsCreatingSectionModalOpen}
        // Ensure CreateSectionModal calls this function with the correct arguments
        onCreateSection={handleCreateSection}
        existingSections={sections} // Pass existing sections if needed for validation inside the modal
      />
    </div>
  );
}

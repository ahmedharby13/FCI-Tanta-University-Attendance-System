"use client";

import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { ClassCard } from "./_components/class-card";
import { CreateClassModal } from "./_components/create-class-modal";
import { DeleteConfirmationModal } from "./_components/delete-confirmation-modal"; // Import delete modal
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

// Define the Class interface
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

// Define the User interface
interface UserData {
  _id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "instructor";
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isUserDataLoading, setIsUserDataLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // State for delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  useEffect(() => {
    const getUserData = async () => {
      // ... (keep existing getUserData logic)
      setIsUserDataLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUserData(null);
          return;
        }
        const response = await axios.get<{ data: UserData }>(
          `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setUserData(response.data.data);
      } catch (err) {
        // console.error("Failed to fetch user data:", err);
        setUserData(null);
      } finally {
        setIsUserDataLoading(false);
      }
    };
    getUserData();
    getAllClasses();
  }, [getAllClasses]);
  // --- End Fetching Logic ---

  // --- Delete Logic ---
  const handleDeleteRequest = (classId: string, className: string) => {
    setClassToDelete({ id: classId, name: className });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (classId: string): Promise<void> => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token not found. Please log in again.");
      throw new Error("Authentication token not found.");
    }

    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/class/delete`, // URL might need classId in path depending on API design, but following user spec for body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: {
            classId: classId,
          },
        },
      );

      if (response.status === 200 || response.status === 204) {
        toast.success(
          `Class "${classToDelete?.name || "Class"}" deleted successfully!`,
        );
        await getAllClasses(false);
        setClassToDelete(null);
      } else {
        throw new Error(
          response.data?.message ||
            `Failed to delete class (Status: ${response.status})`,
        );
      }
    } catch (err: any) {
      // console.error("Failed to delete class:", err);
      let errorMessage = "Failed to delete class. Please try again later.";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage =
          err.response.data?.message || `Error ${err.response.status}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
      setClassToDelete(null);
      throw err;
    }
  };
  // --- End Delete Logic ---

  const canCreateClass =
    !isUserDataLoading &&
    userData &&
    (userData.role === "admin" || userData.role === "instructor");

  if (isLoadingClasses || isUserDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h1 className="text-2xl md:text-3xl font-bold">My Classes</h1>
        {canCreateClass && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Class
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && !isLoadingClasses /* ... error display ... */ && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Content Grid */}
      {classes.length === 0 && !isLoadingClasses ? (
        <div className="text-center text-muted-foreground mt-10">
          <p>You are not enrolled in any classes yet, or no classes found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
          {classes.map((classItem) => (
            <ClassCard
              key={classItem._id}
              classData={classItem}
              userData={userData}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onClassCreated={() => getAllClasses(false)}
        teacherId={userData?._id ?? null}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        classId={classToDelete?.id ?? null}
        className={classToDelete?.name ?? null}
        onConfirmDelete={handleConfirmDelete} // Pass the actual delete function
      />
    </div>
  );
}

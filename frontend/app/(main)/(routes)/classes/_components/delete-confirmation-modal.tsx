import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // Triggered programmatically
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/spinner"; // Assuming spinner path
import { toast } from "sonner";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  classId: string | null;
  className: string | null;
  onConfirmDelete: (classId: string) => Promise<void>; // Make it async to handle loading
}

export const DeleteConfirmationModal: React.FC<
  DeleteConfirmationModalProps
> = ({ isOpen, onOpenChange, classId, className, onConfirmDelete }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!classId) return;

    setIsLoading(true);
    try {
      await onConfirmDelete(classId); // Call the async delete function passed from parent
      // Success toast is handled in the parent after list refresh
      onOpenChange(false); // Close modal on success
    } catch (error) {
      // Error toast is handled in the parent
      // console.error("Deletion failed in modal:", error);
      // Keep modal open on error? Or close? Let's close for now.
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Use AlertDialog for destructive actions
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the class
            <strong className="px-1">{className || "this class"}</strong>
            and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          {/* Use AlertDialogAction for the confirmation */}
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground text-white hover:bg-destructive/90" // Style as destructive
          >
            {isLoading ? <Spinner size="small" className="mr-2" /> : null}
            {isLoading ? "Deleting..." : "Delete Class"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

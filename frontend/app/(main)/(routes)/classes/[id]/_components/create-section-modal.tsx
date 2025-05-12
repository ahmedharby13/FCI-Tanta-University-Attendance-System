import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react"; // Import Loader icon
import { Input } from "@/components/ui/input";

// Define the structure for existing sections if needed for validation
interface ExistingSection {
  sectionNumber: string; // Changed from sectionName to sectionNumber
  // Add other relevant fields if necessary
}

interface CreateSectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSection: (sectionNumber: string) => Promise<void>; // Changed from sectionName to sectionNumber
  existingSections?: ExistingSection[];
}

export function CreateSectionModal({
  isOpen,
  onOpenChange,
  onCreateSection,
  existingSections = [],
}: CreateSectionModalProps) {
  const [sectionNumber, setSectionNumber] = useState<string>(""); // Changed from sectionName to sectionNumber
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!sectionNumber.trim()) {
      toast.error("Please enter a section number.");
      return;
    }

    setIsCreating(true);
    try {
      await onCreateSection(sectionNumber.trim());
      setSectionNumber("");
      onOpenChange(false);
    } catch (error) {
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSectionNumber("");
      setIsCreating(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Section</DialogTitle>
          <DialogDescription>
            Enter the number for the new section.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="section-number" className="text-right">
              Section Number
            </Label>
            <Input
              id="section-number"
              className="col-span-3 input input-bordered w-full"
              type="text"
              value={sectionNumber}
              onChange={(e) => setSectionNumber(e.target.value)}
              disabled={isCreating}
              placeholder="Enter section number"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isCreating}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!sectionNumber.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Section"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

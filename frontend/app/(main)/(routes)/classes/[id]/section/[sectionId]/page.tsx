"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check,
  ChevronsUpDown,
  Trash2,
  Loader2,
  QrCode,
  MapPin,
  ChevronLeft,
  PowerOff,
  X,
  Edit,
  Save,
  RotateCcw,
  Plus,
  UserCheck,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/spinner";
import QrCodeDialog from "./_components/QrCodeDialog";

// --- Interfaces ---
interface Student {
  _id: string;
  name: string;
  email: string;
  studentId: string;
}

interface Section {
  _id: string;
  classId: string;
  sectionNumber: string; // Changed from number to string per your previous changes
  students: Student[];
  createdAt: string;
  className?: string;
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

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface QrCodeData {
  qrImage: string;
  expiresAt: string;
  codeId: string;
}

// Attendance status type
type AttendanceStatus = "present" | "late" | "absent";

// --- LocalStorage Key ---
const MANUAL_LOCATION_STORAGE_KEY = "manualAttendanceLocation";
const SECTION_DAY_NUMBER_KEY = "sectionDayNumber"; // New localStorage key for dayNumber

// --- Component ---
export default function SectionPage({
  params,
}: {
  params: { id: string; sectionId: string };
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const classId = unwrappedParams.id;
  const sectionId = unwrappedParams.sectionId;

  // --- State ---
  const [sectionData, setSectionData] = useState<Section | null>(null);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );

  // New dayNumber state
  const [dayNumber, setDayNumber] = useState<number>(1);

  // Loading States
  const [isLoadingSection, setIsLoadingSection] = useState(true);
  const [isLoadingClass, setIsLoadingClass] = useState(true);
  const [isLoadingAvailableStudents, setIsLoadingAvailableStudents] =
    useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isAddingStudents, setIsAddingStudents] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null,
  );
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isRegeneratingQr, setIsRegeneratingQr] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isClosingQr, setIsClosingQr] = useState(false);

  // UI State
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [qrCodeDetails, setQrCodeDetails] = useState<QrCodeData | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  // Manual Location State
  const [showManualLocationInput, setShowManualLocationInput] = useState(false);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [storedManualLocation, setStoredManualLocation] =
    useState<LocationCoords | null>(null);

  // Manual Attendance States
  const [isManualAttendanceDialogOpen, setIsManualAttendanceDialogOpen] =
    useState(false);
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] =
    useState<string>("");
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>("present");
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;

  // Permissions
  const canManage =
    userData?.role === "admin" || userData?.role === "instructor";

  // --- Check if QR code is expired ---
  const isQrCodeExpired = useCallback(() => {
    if (!qrCodeDetails || !qrCodeDetails.expiresAt) return false;
    try {
      const expirationDate = new Date(qrCodeDetails.expiresAt);
      return new Date() > expirationDate;
    } catch (e) {
      // console.error("Error parsing expiresAt date:", e);
      return true; // Assume expired on error
    }
  }, [qrCodeDetails]);

  // Load location and day number from localStorage
  useEffect(() => {
    try {
      // Load manual location
      const storedLocationString = localStorage.getItem(
        MANUAL_LOCATION_STORAGE_KEY,
      );
      if (storedLocationString) {
        const parsedLocation = JSON.parse(storedLocationString);
        if (
          typeof parsedLocation.latitude === "number" &&
          typeof parsedLocation.longitude === "number"
        ) {
          setStoredManualLocation(parsedLocation);
        } else {
          console.warn(
            "Invalid manual location data found in storage. Clearing.",
          );
          localStorage.removeItem(MANUAL_LOCATION_STORAGE_KEY);
        }
      }

      // Load day number from localStorage
      const storedDayNumberData = localStorage.getItem(SECTION_DAY_NUMBER_KEY);
      if (storedDayNumberData) {
        const dayNumberData = JSON.parse(storedDayNumberData);
        // Only use the stored day number if it matches the current section
        if (dayNumberData.sectionId === sectionId) {
          setDayNumber(dayNumberData.dayNumber);
        } else {
          // Reset day number for a different section
          setDayNumber(1);
        }
      }
    } catch (error) {
      // console.error("Failed to load or parse data from localStorage", error);
    }
  }, [sectionId]);

  // --- Data Fetching Callbacks ---
  const fetchUserData = useCallback(async () => {
    setIsLoadingUser(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found. Please log in.");
        setIsLoadingUser(false);
        return;
      }
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUserData(response.data.data);
    } catch (error) {
      // console.error("Failed to fetch user data", error);
      toast.error("Failed to load user information.");
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Fetch class data - added this new function to get class students
  const fetchClassData = useCallback(async () => {
    if (!classId) {
      console.warn("Class ID parameter is missing.");
      setIsLoadingClass(false);
      return;
    }

    setIsLoadingClass(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found.");
        setIsLoadingClass(false);
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
        // console.error(`Class with ID ${classId} not found in user's classes.`);
        toast.error("Class details not found or access denied.");
        setClassData(null);
      }
    } catch (error) {
      // console.error("Failed to fetch class data", error);
      toast.error("Failed to load class details.");
      setClassData(null);
    } finally {
      setIsLoadingClass(false);
    }
  }, [classId]);

  const fetchSectionData = useCallback(async () => {
    if (!sectionId) {
      console.warn("Section ID parameter is missing.");
      setIsLoadingSection(false);
      return;
    }
    setIsLoadingSection(true);
    setQrCodeDetails(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found.");
        setIsLoadingSection(false);
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/my-sections`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const allSections: Section[] = response.data?.data || response.data || [];
      const currentSection = allSections.find(
        (section) => section._id === sectionId,
      );

      if (currentSection) {
        setSectionData(currentSection);
      } else {
        // console.error(
        // `Section with ID ${sectionId} not found in user's sections.`,
        // );
        toast.error("Section details not found or access denied.");
        setSectionData(null);
      }
    } catch (error) {
      // console.error("Failed to fetch or filter section data", error);
      toast.error("Failed to load section details.");
      setSectionData(null);
    } finally {
      setIsLoadingSection(false);
    }
  }, [sectionId]);

  // Updated function to filter students correctly
  const filterAvailableStudents = useCallback(() => {
    setIsLoadingAvailableStudents(true);

    try {
      // Make sure we have both class and section data
      if (!classData || !classData.students || !sectionData) {
        console.warn(
          "Missing class or section data needed for student filtering",
        );
        setAvailableStudents([]);
        return;
      }

      // Get students from section for filtering
      const sectionStudentIds = new Set(
        sectionData.students?.map((s) => s._id) || [],
      );

      // Filter to only include students who are in the class but not in this section
      const filteredStudents = classData.students.filter(
        (student) => !sectionStudentIds.has(student._id),
      );

      // Sort by name for better user experience
      const sortedStudents = [...filteredStudents].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      setAvailableStudents(sortedStudents);
    } catch (error) {
      // console.error("Failed to filter students", error);
      toast.error("Failed to prepare student list.");
      setAvailableStudents([]);
    } finally {
      setIsLoadingAvailableStudents(false);
    }
  }, [classData, sectionData]);

  // --- Effects ---
  useEffect(() => {
    fetchUserData();
    fetchClassData();
    fetchSectionData();
  }, [fetchUserData, fetchClassData, fetchSectionData]);

  // Update available students whenever class or section data changes
  useEffect(() => {
    if (classData && sectionData) {
      filterAvailableStudents();
    }
  }, [classData, sectionData, filterAvailableStudents]);

  // --- Student Management Handlers ---
  const handleAddStudents = async () => {
    if (selectedStudentIds.size === 0 || !sectionData) return;
    setIsAddingStudents(true);
    const studentIdsArray = Array.from(selectedStudentIds);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      await axios.post(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/add-students`,
        { sectionId: sectionData._id, studentIds: studentIdsArray },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Find the added students from classData.students
      const addedStudents =
        classData?.students.filter((s) => selectedStudentIds.has(s._id)) || [];

      // Update section data with newly added students
      setSectionData((prev) =>
        prev
          ? {
              ...prev,
              students: [...prev.students, ...addedStudents].sort((a, b) =>
                a.name.localeCompare(b.name),
              ),
            }
          : null,
      );

      // Remove added students from available list
      setAvailableStudents((prev) =>
        prev.filter((s) => !selectedStudentIds.has(s._id)),
      );

      // Reset selection
      setSelectedStudentIds(new Set());
      setPopoverOpen(false);

      toast.success(`${studentIdsArray.length} student(s) added to section.`);
    } catch (error) {
      // console.error("Failed to add students", error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : (error as Error).message;
      toast.error(`Failed to add students: ${message}`);
    } finally {
      setIsAddingStudents(false);
    }
  };

  const handleRemoveStudent = async (studentIdToRemove: string) => {
    if (!sectionData) return;
    setRemovingStudentId(studentIdToRemove);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      await axios.delete(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/sections/remove-students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: { sectionId: sectionData._id, studentIds: [studentIdToRemove] },
        },
      );

      // Find the removed student from current section data
      const removedStudent = sectionData.students.find(
        (s) => s._id === studentIdToRemove,
      );

      // Update section data removing this student
      setSectionData((prev) =>
        prev
          ? {
              ...prev,
              students: prev.students.filter(
                (s) => s._id !== studentIdToRemove,
              ),
            }
          : null,
      );

      // Add the student back to available students if they're still in class
      if (
        removedStudent &&
        classData?.students.some((s) => s._id === removedStudent._id)
      ) {
        setAvailableStudents((prev) =>
          [...prev, removedStudent].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      }

      toast.success("Student removed from section.");
    } catch (error) {
      // console.error("Failed to remove student", error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : (error as Error).message;
      toast.error(`Failed to remove student: ${message}`);
    } finally {
      setRemovingStudentId(null);
    }
  };

  // --- Manual Attendance Handler ---
  const handleSubmitManualAttendance = async () => {
    if (!selectedStudentForAttendance || !sectionData || !classId) {
      toast.error("Please select a student and attendance status");
      return;
    }

    setIsSubmittingAttendance(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const payload = {
        studentId: selectedStudentForAttendance,
        classId: classId,
        sectionId: sectionId,
        status: attendanceStatus,
        dayNumber: dayNumber, // Use the current dayNumber state
      };

      // Use the provided endpoint for manual attendance
      await axios.patch(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/attendance/manual`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      toast.success(`Attendance marked as ${attendanceStatus} for the student`);
      setIsManualAttendanceDialogOpen(false);
      setSelectedStudentForAttendance("");
      setAttendanceStatus("present");
    } catch (error) {
      // console.error("Failed to submit manual attendance:", error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : (error as Error).message;
      toast.error(`Failed to mark attendance: ${message}`);
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  // --- Location Helper (with error naming) ---
  const getLocation = (): Promise<LocationCoords> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error(
          "Geolocation is not supported by your browser.",
        );
        error.name = "GeolocationUnsupportedError";
        return reject(error);
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let message = "Failed to get location.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Location permission denied.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out.";
              break;
          }
          const geoError = new Error(message);
          geoError.name = "GeolocationError";
          geoError.cause = error;
          reject(geoError);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  };

  // --- QR Code Handlers (with manual location fallback and storage) ---
  const handleGenerateQr = async (
    sourceCoords?: LocationCoords,
    source?: "manual-input" | "stored",
  ) => {
    if (!sectionData || !classId) {
      toast.error("Section or Class data is missing. Cannot generate QR.");
      return;
    }
    setIsGeneratingQr(true);
    setQrCodeDetails(null);
    setShowManualLocationInput(false);

    let locationCoords: LocationCoords | null = null;
    let locationSource: "manual-input" | "stored" | "automatic" | null = null;

    // --- Determine Location Coordinates ---
    if (sourceCoords) {
      locationCoords = sourceCoords;
      locationSource = source || "manual-input";
      toast.info(
        `Using ${locationSource === "stored" ? "stored" : "manually entered"} location.`,
      );
    } else if (storedManualLocation) {
      locationCoords = storedManualLocation;
      locationSource = "stored";
      toast.info("Using stored manual location.");
    } else {
      setIsGettingLocation(true);
      try {
        locationCoords = await getLocation();
        locationSource = "automatic";
        toast.success("Location obtained automatically.");
      } catch (locationError: any) {
        setIsGettingLocation(false);
        if (
          locationError.name === "GeolocationError" ||
          locationError.name === "GeolocationUnsupportedError"
        ) {
          toast.error(
            `${locationError.message} Please enter location manually.`,
          );
          if (storedManualLocation) {
            setManualLatitude(storedManualLocation.latitude.toString());
            setManualLongitude(storedManualLocation.longitude.toString());
          }
          setShowManualLocationInput(true);
          setIsGeneratingQr(false);
          return;
        } else {
          toast.error(
            `An unexpected error occurred getting location: ${locationError.message}`,
          );
          setIsGeneratingQr(false);
          return;
        }
      } finally {
        setIsGettingLocation(false);
      }
    }

    if (!locationCoords) {
      toast.error("Location coordinates could not be determined.");
      setIsGeneratingQr(false);
      return;
    }

    // --- Proceed with API call to generate QR ---
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const payload = {
        classId: classId,
        sectionId: sectionId,
        sectionNumber: sectionData.sectionNumber,
        dayNumber: dayNumber, // Use the current dayNumber state
        location: {
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
          radius: 500,
        },
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/qrcodes/generate`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (
        response.data?.qrImage &&
        response.data?.expiresAt &&
        response.data?.codeId
      ) {
        setQrCodeDetails({
          qrImage: response.data.qrImage,
          expiresAt: response.data.expiresAt,
          codeId: response.data.codeId,
        });
        setIsQrDialogOpen(true);
        toast.success(
          response.data.message || "QR Code generated successfully!",
        );

        // Store dayNumber in localStorage
        try {
          localStorage.setItem(
            SECTION_DAY_NUMBER_KEY,
            JSON.stringify({
              sectionId: sectionId,
              dayNumber: dayNumber,
            }),
          );
        } catch (storageError) {
          // console.error(
          // "Failed to save dayNumber to localStorage",
          // storageError,
          // );
        }

        if (locationSource === "manual-input" || locationSource === "stored") {
          try {
            localStorage.setItem(
              MANUAL_LOCATION_STORAGE_KEY,
              JSON.stringify(locationCoords),
            );
            setStoredManualLocation(locationCoords);
          } catch (storageError) {
            // console.error(
            //   "Failed to save manual location to localStorage",
            //   storageError,
            // );
            toast.error("Could not save manual location for future use.");
          }
        }
      } else {
        throw new Error("QR Code data missing or invalid in API response.");
      }
    } catch (error) {
      // console.error("Failed to generate QR code API call:", error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : (error as Error).message;
      toast.error(`QR generation failed: ${message}`);
      setQrCodeDetails(null);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Handler for regenerating an expired QR code
  const handleRegenerateQr = async () => {
    try {
      setIsRegeneratingQr(true);
      setIsQrDialogOpen(false); // Close the dialog

      // Use stored location if available for consistency
      if (storedManualLocation) {
        await handleGenerateQr(storedManualLocation, "stored");
        return;
      }

      // Otherwise try automatic location again
      await handleGenerateQr();
    } finally {
      setIsRegeneratingQr(false);
    }
  };

  // Handler for the manual location form submission button
  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLatitude);
    const lon = parseFloat(manualLongitude);

    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      toast.error("Invalid latitude (-90 to 90) or longitude (-180 to 180).");
      return;
    }
    handleGenerateQr({ latitude: lat, longitude: lon }, "manual-input");
  };

  // Handler to show the manual input form, pre-populated if needed
  const handleEditStoredLocation = () => {
    if (storedManualLocation) {
      setManualLatitude(storedManualLocation.latitude.toString());
      setManualLongitude(storedManualLocation.longitude.toString());
    } else {
      setManualLatitude("");
      setManualLongitude("");
    }
    setShowManualLocationInput(true);
  };

  // Handler to clear location from localStorage and state
  const handleClearStoredLocation = () => {
    try {
      localStorage.removeItem(MANUAL_LOCATION_STORAGE_KEY);
      setStoredManualLocation(null);
      setManualLatitude("");
      setManualLongitude("");
      toast.success("Stored manual location cleared.");
    } catch (error) {
      // console.error("Failed to clear stored location", error);
      toast.error("Could not clear stored location.");
    }
  };

  // Handler to close the active QR code session via API
  const handleCloseQr = async () => {
    if (!sectionData) return;
    setIsClosingQr(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const payload = {
        sectionId: sectionData._id,
        dayNumber: dayNumber,
      };
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/qrcodes/close`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      toast.success(
        response.data?.message || "Attendance closed successfully.",
      );
      setIsQrDialogOpen(false);
      setQrCodeDetails(null);

      // Increment dayNumber for next use and save to localStorage
      const nextDayNumber = dayNumber + 1;
      setDayNumber(nextDayNumber);
      try {
        localStorage.setItem(
          SECTION_DAY_NUMBER_KEY,
          JSON.stringify({
            sectionId: sectionId,
            dayNumber: nextDayNumber,
          }),
        );
      } catch (storageError) {
        // console.error(
        //   "Failed to save updated dayNumber to localStorage",
        //   storageError,
        // );
      }
    } catch (error) {
      // console.error("Failed to close QR attendance:", error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || error.message
          : (error as Error).message;
      toast.error(`Failed to close attendance: ${message}`);
    } finally {
      setIsClosingQr(false);
    }
  };

  // --- Render Logic ---
  if (isLoadingUser || isLoadingSection || isLoadingClass) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!sectionData || !classData) {
    return (
      <div className="container mx-auto p-6 text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="mb-4 absolute top-6 left-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-xl text-muted-foreground mt-16">
          {!sectionData
            ? "Section not found or access denied."
            : "Class data not available."}
        </p>
      </div>
    );
  }

  const getSelectedStudentsDisplay = () => {
    if (selectedStudentIds.size === 0) return "Select student(s)...";
    if (selectedStudentIds.size === 1) {
      const id = Array.from(selectedStudentIds)[0];
      const student = availableStudents.find((s) => s._id === id);
      return student ? student.name : "1 student selected";
    }
    return `${selectedStudentIds.size} students selected`;
  };

  // Check if QR Code is expired for UI decisions
  const qrExpired = isQrCodeExpired();

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 pb-16">
      {/* Back Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.back()}
        className="md:left-8"
      >
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      {/* Header Card: Section Details */}
      <Card className="mb-8 md:mt-16">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            {sectionData.sectionNumber}
            {sectionData.className && ` - ${sectionData.className}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Created At: {new Date(sectionData.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {/* --- QR Code Section (Instructor/Admin Only) --- */}
      {canManage && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Attendance QR Code</CardTitle>
              <CardDescription>
                Generate/view QR code. Location options available.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsManualAttendanceDialogOpen(true)}
              className="flex items-center gap-1.5"
            >
              <ClipboardCheck className="h-4 w-4" />
              Manual Attendance
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Day Number Input */}
            <div className="w-full max-w-md grid grid-cols-1 gap-2 mb-4">
              <Label htmlFor="day-number" className="text-sm font-medium">
                Day Number
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  id="day-number"
                  value={dayNumber}
                  onChange={(e) =>
                    setDayNumber(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  className="w-full"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDayNumber(Math.max(1, dayNumber + 1))}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-1" /> Increment
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Set the day number for this attendance session. This will
                increment automatically when you close a QR code session.
              </p>
            </div>

            {/* --- Primary Actions (Conditional Rendering) --- */}

            {/* 1. If QR is Active: Show View and Close Buttons */}
            {qrCodeDetails && (
              <div className="flex flex-wrap justify-center gap-2">
                {/* View Button */}
                <Button
                  onClick={() => setIsQrDialogOpen(true)}
                  className="w-full md:w-auto"
                  variant="secondary"
                >
                  <QrCode className="mr-2 h-4 w-4" /> View QR Code
                  {qrExpired && (
                    <span className="ml-2 text-red-500">(Expired)</span>
                  )}
                </Button>

                {/* Close QR Button (outside dialog) */}
                {!qrExpired && (
                  <Button
                    onClick={handleCloseQr}
                    disabled={isClosingQr}
                    variant="destructive"
                    className="w-full md:w-auto"
                  >
                    {isClosingQr ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PowerOff className="mr-2 h-4 w-4" />
                    )}
                    {isClosingQr ? "Closing..." : "Close QR Code"}
                  </Button>
                )}

                {/* Regenerate Button (if expired) */}
                {qrExpired && (
                  <Button
                    onClick={handleRegenerateQr}
                    disabled={isRegeneratingQr}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isRegeneratingQr ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    {isRegeneratingQr
                      ? "Generating..."
                      : "Generate New QR Code"}
                  </Button>
                )}
              </div>
            )}

            {/* 2. If Manual Input Form is Shown */}
            {showManualLocationInput && !qrCodeDetails && (
              <div className="w-full p-4 border rounded-md bg-secondary/30 flex flex-col gap-4 items-center shadow-inner">
                <p className="text-sm font-medium text-center">
                  Enter Location Manually:
                </p>
                {/* Manual Lat/Lon Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="latitude" className="text-xs">
                      Latitude
                    </Label>
                    <Input
                      type="number"
                      id="latitude"
                      placeholder="e.g., 40.7128"
                      value={manualLatitude}
                      onChange={(e) => setManualLatitude(e.target.value)}
                      step="any"
                      min="-90"
                      max="90"
                      disabled={isGeneratingQr}
                      className="text-sm"
                    />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="longitude" className="text-xs">
                      Longitude
                    </Label>
                    <Input
                      type="number"
                      id="longitude"
                      placeholder="e.g., -74.0060"
                      value={manualLongitude}
                      onChange={(e) => setManualLongitude(e.target.value)}
                      step="any"
                      min="-180"
                      max="180"
                      disabled={isGeneratingQr}
                      className="text-sm"
                    />
                  </div>
                </div>
                {/* Manual Submit/Cancel Buttons */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <Button
                    onClick={handleManualLocationSubmit}
                    disabled={
                      isGeneratingQr || !manualLatitude || !manualLongitude
                    }
                    size="sm"
                  >
                    {isGeneratingQr ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Use & Generate QR
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowManualLocationInput(false);
                    }}
                    disabled={isGeneratingQr}
                    size="sm"
                  >
                    Cancel Manual Entry
                  </Button>
                </div>
              </div>
            )}

            {/* 3. If No QR Active and Not Showing Manual Input: Show Generation Options */}
            {!qrCodeDetails && !showManualLocationInput && (
              <div className="flex flex-wrap justify-center gap-2">
                {/* Automatic Generation Button */}
                <Button
                  onClick={() => handleGenerateQr()}
                  disabled={isGeneratingQr || isGettingLocation}
                  className=""
                >
                  {isGeneratingQr || isGettingLocation ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  {isGettingLocation
                    ? "Getting Location..."
                    : isGeneratingQr
                      ? "Generating..."
                      : "Generate QR (Auto Location)"}
                </Button>

                {/* Use Stored Location Button (if available) */}
                {storedManualLocation && (
                  <Button
                    onClick={() =>
                      handleGenerateQr(storedManualLocation, "stored")
                    }
                    disabled={isGeneratingQr || isGettingLocation}
                    variant="secondary"
                  >
                    {isGeneratingQr || isGettingLocation ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Generate QR (Use Stored)
                  </Button>
                )}

                {/* Button to trigger manual input/edit */}
                <Button
                  onClick={handleEditStoredLocation}
                  variant="outline"
                  disabled={isGeneratingQr || isGettingLocation}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {storedManualLocation
                    ? "Edit Stored Location"
                    : "Enter Location Manually"}
                </Button>
              </div>
            )}

            {/* --- Helper Text & Stored Location Display/Clear --- */}
            {isGettingLocation && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Requesting location...
              </p>
            )}
            {/* Display stored location info only when not actively editing/inputting */}
            {storedManualLocation && !showManualLocationInput && (
              <div className="text-xs text-muted-foreground mt-2 text-center border p-2 rounded-md bg-background w-full max-w-md">
                Stored Location: Lat {storedManualLocation.latitude.toFixed(4)},
                Lon {storedManualLocation.longitude.toFixed(4)}
                <Button
                  onClick={handleClearStoredLocation}
                  variant="link"
                  size="sm"
                  className="ml-2 text-destructive h-auto p-0 align-middle"
                  disabled={isGeneratingQr || isGettingLocation}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Clear
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 text-center">
              QR requires location. Attendance radius is 500 meters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* --- Student Management Section --- */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Students ({sectionData.students.length})</CardTitle>
          <CardDescription>
            Add or remove students from this section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Student Controls - Updated popover */}
          {canManage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-full sm:w-[350px] justify-between"
                    disabled={isLoadingAvailableStudents || isAddingStudents}
                  >
                    {isLoadingAvailableStudents
                      ? "Loading..."
                      : getSelectedStudentsDisplay()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                {/* Popover Content - Updated */}
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search available students..." />
                    <CommandList className="max-h-[300px] overflow-auto">
                      <CommandEmpty>
                        {availableStudents.length === 0
                          ? "All students from this class are already in this section."
                          : "No matching students found."}
                      </CommandEmpty>
                      <CommandGroup>
                        <div className="flex items-center justify-between px-2 py-1.5 border-b">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              const allStudentIds = new Set(
                                availableStudents.map((s) => s._id),
                              );
                              setSelectedStudentIds(allStudentIds);
                            }}
                            disabled={availableStudents.length === 0}
                          >
                            Select All
                          </Button>
                          {selectedStudentIds.size > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => setSelectedStudentIds(new Set())}
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
                              setSelectedStudentIds((prev) => {
                                const newSet = new Set(prev);
                                newSet.has(student._id)
                                  ? newSet.delete(student._id)
                                  : newSet.add(student._id);
                                return newSet;
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStudentIds.has(student._id)
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
              {/* Add Button */}
              <Button
                onClick={handleAddStudents}
                disabled={
                  selectedStudentIds.size === 0 ||
                  isAddingStudents ||
                  isLoadingAvailableStudents
                }
                className="w-full sm:w-auto"
              >
                {isAddingStudents ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add {selectedStudentIds.size || ""} Student
                {selectedStudentIds.size !== 1 ? "s" : ""}
              </Button>
            </div>
          )}

          {/* Show a note about available students */}
          {canManage &&
            !isLoadingAvailableStudents &&
            availableStudents.length === 0 && (
              <div className="mb-4 text-sm text-muted-foreground bg-muted/20 p-3 rounded-md">
                <p>
                  All students from this class are already added to this
                  section.
                </p>
              </div>
            )}

          {/* Students Table */}
          {isLoadingSection && !sectionData ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : sectionData.students && sectionData.students.length > 0 ? (
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
                      <TableHead className="w-[120px] text-right">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionData.students
                    .slice(
                      (currentPage - 1) * studentsPerPage,
                      currentPage * studentsPerPage,
                    )
                    .map((student) => (
                      <TableRow key={student._id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {student.email}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Manual Attendance Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedStudentForAttendance(student._id);
                                  setIsManualAttendanceDialogOpen(true);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={`Mark attendance for ${student.name}`}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>

                              {/* Remove Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveStudent(student._id)}
                                disabled={removingStudentId === student._id}
                                aria-label={`Remove ${student.name}`}
                              >
                                {removingStudentId === student._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {sectionData.students.length > studentsPerPage && (
                <div className="flex items-center justify-center space-x-2 py-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of{" "}
                    {Math.ceil(sectionData.students.length / studentsPerPage)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(
                          prev + 1,
                          Math.ceil(
                            sectionData.students.length / studentsPerPage,
                          ),
                        ),
                      )
                    }
                    disabled={
                      currentPage ===
                      Math.ceil(sectionData.students.length / studentsPerPage)
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 bg-muted/10 rounded-lg border border-dashed">
              <p className="text-muted-foreground">
                No students are currently enrolled in this section.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- QR Code Dialog (Modal) --- */}
      {qrCodeDetails && (
        <QrCodeDialog
          isOpen={isQrDialogOpen}
          onOpenChange={setIsQrDialogOpen}
          qrCodeDataUrl={qrCodeDetails.qrImage}
          expiresAt={qrCodeDetails.expiresAt}
          onCloseQr={handleCloseQr}
          isClosingQr={isClosingQr}
          onRegenerateQr={handleRegenerateQr}
          isRegeneratingQr={isRegeneratingQr}
        />
      )}

      {/* --- Manual Attendance Dialog --- */}
      <Dialog
        open={isManualAttendanceDialogOpen}
        onOpenChange={setIsManualAttendanceDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manual Attendance</DialogTitle>
            <DialogDescription>
              Record attendance manually for students who didn't scan the QR
              code.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Student Selector */}
            <div className="space-y-2">
              <Label htmlFor="student-select">Select Student</Label>
              <Select
                value={selectedStudentForAttendance}
                onValueChange={setSelectedStudentForAttendance}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {sectionData.students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name} ({student.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Attendance Status */}
            <div className="space-y-2">
              <Label>Attendance Status</Label>
              <RadioGroup
                value={attendanceStatus}
                onValueChange={(value) =>
                  setAttendanceStatus(value as AttendanceStatus)
                }
                className="flex space-x-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="present" id="present" />
                  <Label htmlFor="present" className="cursor-pointer">
                    Present
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="late" id="late" />
                  <Label htmlFor="late" className="cursor-pointer">
                    Late
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="absent" id="absent" />
                  <Label htmlFor="absent" className="cursor-pointer">
                    Absent
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManualAttendanceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitManualAttendance}
              disabled={!selectedStudentForAttendance || isSubmittingAttendance}
            >
              {isSubmittingAttendance ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

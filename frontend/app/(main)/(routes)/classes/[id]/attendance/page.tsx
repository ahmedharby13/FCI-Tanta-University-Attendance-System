"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  ChevronLeft,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import {
  OverallAttendanceChart,
  AttendanceStatusChart,
  StudentAttendanceChart,
  AttendanceTimelineChart,
  SectionAttendanceHeatmap,
} from "../_components/attendance-charts";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { toast } from "sonner";

// Types for our API responses
interface Attendance {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
    studentId: string;
  };
  status: string;
  dayNumber: number;
  sectionId: string;
  recordedAt: string;
}

interface StudentStatistics {
  studentId: string;
  name: string;
  email: string;
  studentCode: string;
  totalAttended: number;
  totalAbsent: number;
  totalLate: number;
  totalSections: number;
  attendancePercentage: string;
  sectionAttendance: {
    sectionNumber: number;
    days: { dayNumber: number; status: string }[];
  }[];
}

export default function AttendanceStatsPage() {
  const params = useParams();
  const classId = params.id as string;

  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [statisticsData, setStatisticsData] = useState<StudentStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportAttendanceData = async () => {
    try {
      setExporting(true); // Optional: Add a loading state if you want to show a spinner

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      // Make the request with responseType 'blob' to handle binary file data
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/export/?classId=${classId}&format=excel`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob", // Important for binary data like Excel files
        },
      );

      // Create a blob URL from the response data
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement("a");

      // Get the class name for the filename, fallback to the classId if name is not available
      const className = `class-${classId}`;

      // Set link properties
      link.href = url;
      link.setAttribute(
        "download",
        `${className}-attendance-${new Date().toISOString().split("T")[0]}.xlsx`,
      );

      // Append the link to the document
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up by removing the link and revoking the URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Attendance data exported successfully!");
    } catch (error) {
      // console.error("Failed to export attendance data:", error);
      let errorMessage = "Failed to export attendance data.";

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }

      toast.error(errorMessage);
    } finally {
      setExporting(false); // Reset loading state
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both endpoints in parallel
        const [attendanceResponse, statisticsResponse] = await Promise.all([
          axios.get(
            `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/attendance?classId=${classId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          ),
          axios.get(
            `${process.env.NEXT_PUBLIC_NETWORK_HOST}/api/attendance/statistics?classId=${classId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          ),
        ]);

        if (
          attendanceResponse.data.success &&
          statisticsResponse.data.success
        ) {
          setAttendanceData(attendanceResponse.data.data);
          setStatisticsData(statisticsResponse.data.data);
        } else {
          throw new Error("Failed to fetch attendance data");
        }
      } catch (err) {
        // console.error("Error fetching attendance data:", err);
        setError("Failed to load attendance data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchData();
    }
  }, [classId]);

  // Calculate aggregated class statistics
  const classStats = {
    totalStudents: statisticsData.length,
    totalPresent: statisticsData.reduce(
      (sum, student) => sum + student.totalAttended,
      0,
    ),
    totalAbsent: statisticsData.reduce(
      (sum, student) => sum + student.totalAbsent,
      0,
    ),
    totalLate: statisticsData.reduce(
      (sum, student) => sum + student.totalLate,
      0,
    ),
    averageAttendance: statisticsData.length
      ? statisticsData.reduce(
          (sum, student) => sum + parseFloat(student.attendancePercentage),
          0,
        ) / statisticsData.length
      : 0,
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/classes">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold">
        Class ({localStorage.getItem("className")}) Attendance Dashboard
      </h1>
      <Button
        onClick={exportAttendanceData}
        disabled={exporting}
        variant="outline"
      >
        {exporting ? (
          <Spinner size="sm" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        {exporting ? "Exporting..." : "Export to Excel"}
      </Button>

      {/* Overall Class Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={classStats.totalStudents}
          description="Enrolled in this class"
        />
        <StatCard
          title="Average Attendance"
          value={`${classStats.averageAttendance.toFixed(1)}%`}
          description="Across all sessions"
        />
        <StatCard
          title="Total Sessions"
          value={
            statisticsData[0]?.sectionAttendance.reduce(
              (total, section) => total + section.days.length,
              0,
            ) || 0
          }
          description="Held so far"
        />
        <StatCard
          title="Last Session"
          value={
            attendanceData.length
              ? new Date(
                  attendanceData[attendanceData.length - 1].recordedAt,
                ).toLocaleDateString()
              : "N/A"
          }
          description="Date recorded"
        />
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Class Overview</TabsTrigger>
          <TabsTrigger value="students">Student Analytics</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Attendance Rate</CardTitle>
                <CardDescription>Class attendance percentage</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <OverallAttendanceChart data={classStats} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Status</CardTitle>
                <CardDescription>
                  Present, absent and late distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <AttendanceStatusChart
                  present={classStats.totalPresent}
                  absent={classStats.totalAbsent}
                  late={classStats.totalLate}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance Percentages</CardTitle>
              <CardDescription>Individual attendance rates</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <StudentAttendanceChart data={statisticsData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Timeline</CardTitle>
              <CardDescription>Attendance patterns over time</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <AttendanceTimelineChart data={attendanceData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section Attendance Heatmap</CardTitle>
              <CardDescription>
                Visualizes attendance patterns by section and day
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <SectionAttendanceHeatmap data={statisticsData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Skeleton className="h-10 w-1/3" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

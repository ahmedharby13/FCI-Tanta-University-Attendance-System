"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Clock4Icon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interfaces
interface Section {
  _id: string;
  sectionNumber: number;
  classId: string;
  className: string;
  date: string;
  dayNumber: number;
  createdAt: string;
  updatedAt: string;
}

interface SectionInfo {
  _id: string;
  sectionNumber: number;
}

interface AttendanceRecord {
  _id: string;
  sectionId: SectionInfo;
  dayNumber: number;
  status: "present" | "absent" | "late";
  recordedAt: string;
}

interface ClassSummary {
  classId: string;
  className: string;
  sections: Section[];
  attendanceRecords: AttendanceRecord[];
}

// Status colors
const STATUS_COLORS = {
  present: "#10b981", // emerald-500
  absent: "#ef4444", // red-500
  late: "#f59e0b", // amber-500
};

const AttendanceDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found");
        }

        // Fetch sections data
        const sectionsResponse = await axios.get(
          "https://absent-system.up.railway.app/api/sections/my-sections",
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const fetchedSections = sectionsResponse.data.data;
        setSections(fetchedSections);

        // Group sections by classId
        const classesMap = new Map<
          string,
          { id: string; name: string; sections: Section[] }
        >();

        fetchedSections.forEach((section: Section) => {
          if (!classesMap.has(section.classId)) {
            classesMap.set(section.classId, {
              id: section.classId,
              name: section.className,
              sections: [section],
            });
          } else {
            classesMap.get(section.classId)?.sections.push(section);
          }
        });

        // Set default selected class to the first one
        if (fetchedSections.length > 0 && !selectedClassId) {
          setSelectedClassId(fetchedSections[0].classId);
        }

        // Fetch attendance data for each class
        const summaries: ClassSummary[] = [];

        for (const [classId, classInfo] of classesMap.entries()) {
          const attendanceResponse = await axios.get(
            `https://absent-system.up.railway.app/api/attendance/student?classId=${classId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

          const records = attendanceResponse.data.data;

          summaries.push({
            classId,
            className: classInfo.name,
            sections: classInfo.sections,
            attendanceRecords: records,
          });

          // If this is the selected class, update the attendance records state
          if (
            classId === selectedClassId ||
            (!selectedClassId && classId === fetchedSections[0].classId)
          ) {
            setAttendanceRecords(records);
          }
        }

        setClassSummaries(summaries);
      } catch (error) {
        // console.error("Failed to fetch attendance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update attendance records when selected class changes
  useEffect(() => {
    if (selectedClassId) {
      const selectedSummary = classSummaries.find(
        (summary) => summary.classId === selectedClassId,
      );
      if (selectedSummary) {
        setAttendanceRecords(selectedSummary.attendanceRecords);
      }
    }
  }, [selectedClassId, classSummaries]);

  // Prepare data for charts
  const prepareStatusDistributionData = () => {
    const statusCounts = { present: 0, absent: 0, late: 0 };

    attendanceRecords.forEach((record) => {
      statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  };

  const prepareSectionAttendanceData = () => {
    const sectionMap = new Map<
      number,
      { present: number; absent: number; late: number }
    >();

    // Initialize the map with all sections
    sections
      .filter((section) => section.classId === selectedClassId)
      .forEach((section) => {
        sectionMap.set(section.sectionNumber, {
          present: 0,
          absent: 0,
          late: 0,
        });
      });

    // Count attendance by section
    attendanceRecords.forEach((record) => {
      const sectionNumber = record.sectionId.sectionNumber;
      const status = record.status;

      if (sectionMap.has(sectionNumber)) {
        const current = sectionMap.get(sectionNumber);
        if (current) {
          current[status] += 1;
          sectionMap.set(sectionNumber, current);
        }
      }
    });

    // Transform map to array for chart
    return Array.from(sectionMap.entries()).map(([sectionNumber, counts]) => ({
      sectionNumber: `Section ${sectionNumber}`,
      ...counts,
    }));
  };

  const prepareAttendanceTimeline = () => {
    // Sort records by date
    const sortedRecords = [...attendanceRecords].sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );

    // Calculate cumulative attendance stats over time
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    return sortedRecords.map((record) => {
      if (record.status === "present") presentCount++;
      else if (record.status === "absent") absentCount++;
      else if (record.status === "late") lateCount++;

      return {
        date: format(parseISO(record.recordedAt), "MMM dd"),
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        // Include section info for tooltip
        section: `Section ${record.sectionId.sectionNumber}`,
        status: record.status,
        fullDate: format(parseISO(record.recordedAt), "PPp"),
      };
    });
  };

  // Calculate attendance stats
  const calculateStats = () => {
    const total = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(
      (r) => r.status === "present",
    ).length;
    const absentCount = attendanceRecords.filter(
      (r) => r.status === "absent",
    ).length;
    const lateCount = attendanceRecords.filter(
      (r) => r.status === "late",
    ).length;

const attendanceRate = total > 0 ? ((presentCount + lateCount) / total) * 100 : 0; //متفتكس تاني و متشغلش دماغك يعم زياااااااااد و تبا لك

    return {
      total,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate: attendanceRate.toFixed(1),
    };
  };

  const stats = calculateStats();
  const statusDistributionData = prepareStatusDistributionData();
  const sectionAttendanceData = prepareSectionAttendanceData();
  const attendanceTimelineData = prepareAttendanceTimeline();

  // Get class name for display
  const getSelectedClassName = () => {
    const selectedClass = classSummaries.find(
      (c) => c.classId === selectedClassId,
    );
    return selectedClass?.className || "Loading...";
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Timeline tooltip
  const TimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-md shadow-md p-3">
          <p className="font-medium">{data.fullDate}</p>
          <p>{data.section}</p>
          <div className="flex items-center gap-1 mt-1">
            <span style={{ color: STATUS_COLORS[data.status] }}>
              {data.status === "present" ? (
                <CheckCircle2Icon className="h-4 w-4" />
              ) : data.status === "absent" ? (
                <XCircleIcon className="h-4 w-4" />
              ) : (
                <Clock4Icon className="h-4 w-4" />
              )}
            </span>
            <span
              style={{ color: STATUS_COLORS[data.status] }}
              className="capitalize"
            >
              {data.status}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-[120px] rounded-lg" />
          <Skeleton className="h-[120px] rounded-lg" />
          <Skeleton className="h-[120px] rounded-lg" />
        </div>

        <Skeleton className="h-[400px] rounded-lg mt-6" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 pb-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Attendance Dashboard
        </h1>
        <p className="text-muted-foreground">
          Track your attendance across all classes
        </p>
      </div>

      {/* Class Selector */}
      <div className="flex justify-items-start items-start">
        <div className="w-full ">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classSummaries.map((classSummary) => (
                <SelectItem
                  key={classSummary.classId}
                  value={classSummary.classId}
                >
                  {classSummary.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-lg py-1.5 px-3">
          {getSelectedClassName()}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Rate
            </CardTitle>
            <CheckCircle2Icon className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground pt-1">
              {stats.presentCount} present out of {stats.total} classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Classes Attended
            </CardTitle>
            <CalendarIcon className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Total classes recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Status Breakdown
            </CardTitle>
            <div className="flex space-x-1">
              <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl flex gap-3">
              <span className="flex items-center">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1"></span>
                <span className="font-bold">{stats.presentCount}</span>
                <span className="text-xs ml-1">Present</span>
              </span>
              <span className="flex items-center">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1"></span>
                <span className="font-bold">{stats.absentCount}</span>
                <span className="text-xs ml-1">Absent</span>
              </span>
              <span className="flex items-center">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
                <span className="font-bold">{stats.lateCount}</span>
                <span className="text-xs ml-1">Late</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Charts */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-8"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">By Section</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {attendanceRecords.length === 0 ? (
            <div className="flex justify-center items-center h-[400px] bg-muted/20 rounded-lg">
              <div className="text-center">
                <p className="text-lg text-muted-foreground">
                  No attendance records found for this class.
                </p>
                <p className="text-sm text-muted-foreground">
                  Attendance will appear here once recorded.
                </p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of your attendance status across all recorded
                  classes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                        label={({
                          cx,
                          cy,
                          midAngle,
                          innerRadius,
                          outerRadius,
                          percent,
                          index,
                          name,
                        }) => {
                          const radius =
                            innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x =
                            cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y =
                            cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="white"
                              textAnchor={x > cx ? "start" : "end"}
                              dominantBaseline="central"
                            >
                              {`${name} (${(percent * 100).toFixed(0)}%)`}
                            </text>
                          );
                        }}
                      >
                        {statusDistributionData.map((entry, index) => {
                          let color = STATUS_COLORS.present;
                          switch (entry.name.toLowerCase()) {
                            case "present":
                              color = STATUS_COLORS.present;
                              break;
                            case "absent":
                              color = STATUS_COLORS.absent;
                              break;
                            case "late":
                              color = STATUS_COLORS.late;
                              break;
                          }
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sections" className="mt-6 space-y-6">
          {sectionAttendanceData.length === 0 ? (
            <div className="flex justify-center items-center h-[400px] bg-muted/20 rounded-lg">
              <div className="text-center">
                <p className="text-lg text-muted-foreground">
                  No section data available.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please select a class with section attendance records.
                </p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Section</CardTitle>
                <CardDescription>
                  Comparing attendance status across different sections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sectionAttendanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sectionNumber" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="present"
                        name="Present"
                        stackId="a"
                        fill={STATUS_COLORS.present}
                      />
                      <Bar
                        dataKey="late"
                        name="Late"
                        stackId="a"
                        fill={STATUS_COLORS.late}
                      />
                      <Bar
                        dataKey="absent"
                        name="Absent"
                        stackId="a"
                        fill={STATUS_COLORS.absent}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-6 space-y-6">
          {attendanceTimelineData.length === 0 ? (
            <div className="flex justify-center items-center h-[400px] bg-muted/20 rounded-lg">
              <div className="text-center">
                <p className="text-lg text-muted-foreground">
                  No timeline data available.
                </p>
                <p className="text-sm text-muted-foreground">
                  Attendance timeline will show once you have multiple records.
                </p>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Timeline</CardTitle>
                <CardDescription>
                  Tracking your attendance patterns over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={attendanceTimelineData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<TimelineTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="present"
                        name="Present"
                        stroke={STATUS_COLORS.present}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="late"
                        name="Late"
                        stroke={STATUS_COLORS.late}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="absent"
                        name="Absent"
                        stroke={STATUS_COLORS.absent}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Attendance Records */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight mb-4">
          Recent Attendance Records
        </h2>

        {attendanceRecords.length === 0 ? (
          <Card>
            <CardContent className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">
                No recent attendance records found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {attendanceRecords.map((record) => {
              let statusColor;
              let statusIcon;

              switch (record.status) {
                case "present":
                  statusColor = "text-emerald-500";
                  statusIcon = <CheckCircle2Icon className="h-5 w-5" />;
                  break;
                case "absent":
                  statusColor = "text-red-500";
                  statusIcon = <XCircleIcon className="h-5 w-5" />;
                  break;
                case "late":
                  statusColor = "text-amber-500";
                  statusIcon = <Clock4Icon className="h-5 w-5" />;
                  break;
              }

              return (
                <Card key={record._id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex flex-col">
                      <div className="font-medium">
                        Section {record.sectionId.sectionNumber} - Day{" "}
                        {record.dayNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(record.recordedAt), "PPpp")}
                      </div>
                    </div>
                    <div className={`flex items-center ${statusColor}`}>
                      {statusIcon}
                      <span className="ml-2 capitalize">{record.status}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceDashboard;

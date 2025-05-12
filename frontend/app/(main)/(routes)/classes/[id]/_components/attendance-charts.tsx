"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Color palette
const colors = {
  present: "#10b981", // Green
  absent: "#ef4444", // Red
  late: "#f59e0b", // Amber
  primary: "#3b82f6", // Blue
  secondary: "#8b5cf6", // Purple
  background: "#f1f5f9", // Slate 100
  text: "#334155", // Slate 700
};

// Custom animation hook
const useChartAnimation = (data: any[]) => {
  const [animatedData, setAnimatedData] = useState<any[]>([]);

  // Stringify data for comparison to prevent unnecessary updates
  const dataString = useMemo(() => JSON.stringify(data), [data]);

  useEffect(() => {
    setAnimatedData([]);

    // Small delay for animation effect
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 100);

    return () => clearTimeout(timer);
  }, [dataString]); // Only re-run when data actually changes

  return animatedData;
};

// 1. Overall Attendance Chart (Radial)
export function OverallAttendanceChart({ data }: { data: any }) {
  const chartData = useMemo(
    () => [
      {
        name: "Attendance",
        value: data.averageAttendance,
        fill: colors.primary,
      },
    ],
    [data.averageAttendance],
  );

  const animatedData = useChartAnimation(chartData);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="20%"
        outerRadius="90%"
        barSize={30}
        data={animatedData}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar
          background={{ fill: colors.background }}
          dataKey="value"
          cornerRadius={10}
          label={{
            position: "center",
            fill: colors.text,
            fontSize: 32,
            formatter: (value: number) => `${Math.round(value)}%`,
          }}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Attendance Rate"]}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
          }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

// 2. Attendance Status Chart (Pie)
export function AttendanceStatusChart({
  present,
  absent,
  late,
}: {
  present: number;
  absent: number;
  late: number;
}) {
  const chartData = useMemo(
    () =>
      [
        { name: "Present", value: present, color: colors.present },
        { name: "Absent", value: absent, color: colors.absent },
        { name: "Late", value: late, color: colors.late },
      ].filter((item) => item.value > 0),
    [present, absent, late],
  );

  const animatedData = useChartAnimation(chartData);

  // If no data, show empty state
  if (chartData.length === 0 || (present === 0 && absent === 0 && late === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No attendance data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={animatedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          animationDuration={1000}
          animationBegin={200}
        >
          {animatedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [value, "Count"]}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 3. Student Attendance Chart (Bar)
export function StudentAttendanceChart({ data }: { data: any[] }) {
  // Sort by attendance percentage for better visualization
  const sortedData = useMemo(
    () =>
      [...data]
        .sort(
          (a, b) =>
            parseFloat(b.attendancePercentage) -
            parseFloat(a.attendancePercentage),
        )
        .map((student) => ({
          name: student.name,
          percentage: parseFloat(student.attendancePercentage),
          studentId: student.studentId,
        })),
    [data],
  );

  const animatedData = useChartAnimation(sortedData);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No student data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={animatedData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Attendance Rate"]}
          labelFormatter={(value) => `Student: ${value}`}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
          }}
        />
        <Bar
          dataKey="percentage"
          fill={colors.primary}
          radius={[0, 4, 4, 0]}
          animationDuration={1500}
          label={{
            position: "right",
            formatter: (value: number) => `${Math.round(value)}%`,
            fill: colors.text,
            fontSize: 12,
          }}
        >
          {animatedData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.percentage > 75
                  ? colors.present
                  : entry.percentage > 50
                    ? colors.late
                    : colors.absent
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 4. Attendance Timeline Chart (Line)
export function AttendanceTimelineChart({ data }: { data: any[] }) {
  // Group attendance by day and calculate percentages
  const timelineData = useMemo(() => {
    const groupedByDay = data.reduce((acc: any, record) => {
      const day = record.dayNumber;
      if (!acc[day]) {
        acc[day] = { day, present: 0, absent: 0, total: 0 };
      }

      if (record.status === "present") {
        acc[day].present += 1;
      } else if (record.status === "absent") {
        acc[day].absent += 1;
      }

      acc[day].total += 1;
      return acc;
    }, {});

    return Object.values(groupedByDay)
      .map((dayData: any) => ({
        ...dayData,
        percentage:
          dayData.total > 0 ? (dayData.present / dayData.total) * 100 : 0,
      }))
      .sort((a: any, b: any) => a.day - b.day);
  }, [data]);

  const animatedData = useChartAnimation(timelineData);

  if (timelineData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No timeline data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={animatedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          label={{ value: "Day Number", position: "insideBottom", offset: -5 }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          label={{
            value: "Attendance Rate",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip
          formatter={(value: any) => [
            `${parseFloat(value).toFixed(1)}%`,
            "Attendance Rate",
          ]}
          labelFormatter={(value) => `Day ${value}`}
          contentStyle={{
            backgroundColor: "rgba(32, 32, 32, 0.9)", // لوووووووووووون الباكك جراوند بتااع اليووووووم و النسبهههههه
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="percentage"
          stroke={colors.primary}
          strokeWidth={3}
          activeDot={{ r: 8 }}
          animationDuration={2000}
          name="Attendance %"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 5. Section Attendance Heatmap
export function SectionAttendanceHeatmap({ data }: { data: any[] }) {
  // Use loading indicator instead of try to render incomplete data
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate loading to prevent render issues
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="animate-pulse">Loading heatmap data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
      <p className="text-lg font-medium text-gray-500 dark:text-white">
        Section attendance heatmap
      </p>
      <div className="grid grid-cols-1 gap-2 w-full max-h-72 overflow-y-auto px-4">
        {data.map((student) => (
          <div
            key={student.studentId}
            className="flex items-center bg-gray-50 p-2 rounded-md text-sm dark:bg-zinc-800"
          >
            <div className="w-40 truncate pr-2">{student.name}</div>
<div className="flex-1 flex items-center gap-1">
  {student.sectionAttendance
    .flatMap((s) => s.days)
    .map((dayData, index) => {
      const status = dayData?.status || "";
      const color =
        status === "P"
          ? "bg-green-200 dark:bg-green-500/30 text-black dark:text-white font-xl"
          : status === "A"
            ? "bg-red-200 dark:bg-red-500/30 text-black dark:text-white"
            : status === "L"
              ? "bg-amber-200 dark:bg-amber-500/30 text-black dark:text-white"
              : "bg-gray-200 dark:bg-gray-500/30 text-black dark:text-white";

      return (
        <div
          key={index}
          className={`w-8 h-8 ${color} flex items-center justify-center rounded-sm`}
          title={`Day ${dayData.dayNumber}: ${status === "P" ? "Present" : status === "A" ? "Absent" : status === "L" ? "Late" : "No data"}`}
        >
          {status || "-"}
        </div>
      );
    })}
</div>
            <div className="w-16 text-right font-medium">
              {student.attendancePercentage}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

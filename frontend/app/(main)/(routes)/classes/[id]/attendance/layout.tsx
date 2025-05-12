import { Suspense } from "react";

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="attendance-dashboard">
      <Suspense fallback={<div>Loading...</div>}>
        {children}
      </Suspense>
    </div>
  );
}
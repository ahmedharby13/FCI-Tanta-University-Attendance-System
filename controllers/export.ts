import { Response } from 'express';
import { getDistance } from 'geolib';
import { Code } from '../models/code';
import { Attendance } from '../models/attendance';
import { Class } from '../models/class';
import { Section } from '../models/section';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { AuthRequest } from '../types/AuthRequest';
import ExcelJS from 'exceljs';
import { Document, Types } from 'mongoose';

// Define interfaces for Mongoose models
interface Student {
  _id: Types.ObjectId;
  name: string;
  email: string;
  studentId: string;
}

interface ClassDocument extends Document {
  _id: Types.ObjectId;
  students: Student[];
}

interface SectionDocument extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  name: string;
  sectionNumber: number;
  students?: Types.ObjectId[];
  date: Date;
}

interface AttendanceDocument extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  studentId: Student;
  status: string;
  dayNumber: number;
  recordedAt: Date;
}

export const exportAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { classId, sectionId, format } = req.query;

  if (!classId) throw new AppError('Class ID is required', 400);
  if (format !== 'excel') throw new AppError('Only Excel format is supported', 400);

  // Fetch class with students
  const classDoc = await Class.findById(classId)
    .populate<{ students: Student[] }>('students', 'name email studentId')
    .exec();
  if (!classDoc) throw new AppError('Class not found', 404);

  // Fetch sections
  let sectionsQuery: any = { classId };
  if (sectionId) {
    sectionsQuery._id = sectionId;
  }
  const sections = await Section.find(sectionsQuery)
    .sort({ sectionNumber: 1 })
    .exec() as SectionDocument[];
  if (!sections.length) throw new AppError('No sections found for this class', 404);

  const sectionIds = sections.map((s) => s._id);

  // Get unique dayNumbers from attendance records
  const uniqueDays = await Attendance.distinct('dayNumber', {
    classId,
    sectionId: { $in: sectionIds },
  });
  uniqueDays.sort((a: number, b: number) => a - b);

  if (!uniqueDays.length) {
    uniqueDays.push(1);
    logger.warn(`No attendance days found for classId=${classId}, sectionId=${sectionId || 'N/A'}, defaulting to Day 1`);
  }

  // Fetch raw attendance records
  const attendanceRecords = await Attendance.find({
    classId,
    sectionId: { $in: sectionIds },
  })
    .populate<{ studentId: Student }>('studentId', 'name email studentId')
    .exec() as AttendanceDocument[];
  

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Merge cells for main headers
  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = 'Student Data';
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A1').font = { bold: true, size: 14 };

  const attendanceStartCol = String.fromCharCode(69); // 'E'
  const attendanceEndCol = String.fromCharCode(69 + uniqueDays.length + 1); // Includes Total and Attendance %
  worksheet.mergeCells(`${attendanceStartCol}1:${attendanceEndCol}1`);
  worksheet.getCell(`${attendanceStartCol}1`).value = 'Class Attendance';
  worksheet.getCell(`${attendanceStartCol}1`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`${attendanceStartCol}1`).font = { bold: true, size: 14 };

  // Sub-headers
  const headers = [
    'Student ID',
    'Name',
    'Email',
    'Section Number',
    ...uniqueDays.map((day) => `Day ${day}`),
    'Total',
    'Attendance %', // New column
  ];
  worksheet.getRow(2).values = headers;
  worksheet.getRow(2).font = { bold: true };
  worksheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };

  // Set column widths
  worksheet.columns = [
    { key: 'studentId', width: 15 },
    { key: 'name', width: 25 },
    { key: 'email', width: 30 },
    { key: 'sectionNumber', width: 15 },
    ...uniqueDays.map(() => ({ width: 10 })),
    { key: 'total', width: 10 },
    { key: 'attendancePercentage', width: 12 }, // New column width
  ];

  // Add student data
  const rows: any[] = [];
  await Promise.all(
    classDoc.students.map(async (student: Student) => {
      // Find the section(s) the student is assigned to
      const studentSections = sections.filter((s) =>
        s.students?.some((id) => id.toString() === student._id.toString())
      );

      // Filter attendance records for the student
      const studentAttendance = attendanceRecords.filter(
        (record) => record.studentId._id.toString() === student._id.toString()
      );

      // Calculate total (present + late)
      const totalAttended = studentAttendance.filter((a) => a.status === 'present').length;
      const totalLate = studentAttendance.filter((a) => a.status === 'late').length;
      const totalSections = totalAttended + totalLate;

      // Calculate attendance percentage
      const totalPossibleSessions = studentSections.length * uniqueDays.length;
      const attendancePercentage = totalPossibleSessions > 0
        ? ((totalSections / totalPossibleSessions) * 100).toFixed(2)
        : '0.00';

      const row: any = {
        studentId: student.studentId, // Unified with studentId
        name: student.name,
        email: student.email,
        sectionNumber: studentSections.length > 0 ? studentSections[0].sectionNumber : 'N/A',
        total: totalSections,
        attendancePercentage, // New field
      };

      // Add attendance status for each day
      uniqueDays.forEach((day) => {
        const columnKey = `day_${day}`;
        if (studentSections.length === 0) {
          row[columnKey] = '-'; // No section assignment
        } else {
          // Find attendance record for the day in any of the student's sections
          const attendance = studentAttendance.find(
            (a) =>
              a.dayNumber === day &&
              studentSections.some((s) => s._id.toString() === a.sectionId.toString())
          );
          row[columnKey] = attendance
            ? attendance.status === 'present'
              ? 'P'
              : attendance.status === 'late'
              ? 'L'
              : '' // Absent or other status
            : ''; // No record found (assume absent)
        }
      });

      rows.push(row);
    })
  );

  // Sort rows by sectionNumber and then by name
  rows.sort((a, b) => {
    const sectionA = a.sectionNumber === 'N/A' ? Infinity : a.sectionNumber;
    const sectionB = b.sectionNumber === 'N/A' ? Infinity : b.sectionNumber;
    if (sectionA === sectionB) {
      return a.name.localeCompare(b.name);
    }
    return sectionA - sectionB;
  });

  // Add sorted rows to worksheet
  rows.forEach((row) => worksheet.addRow(row));

  // Style the worksheet
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      if (rowNumber > 2) {
        if (colNumber > 4 && colNumber <= uniqueDays.length + 4) {
          // Day columns
          cell.alignment = { horizontal: 'center' };
          cell.font = {
            color: { argb: cell.value === 'P' ? 'FF008000' : cell.value === 'L' ? 'FFA500' : 'FF000000' },
          };
        } else if (colNumber === uniqueDays.length + 5) {
          // Total column
          cell.alignment = { horizontal: 'center' };
        } else if (colNumber === uniqueDays.length + 6) {
          // Attendance % column
          cell.alignment = { horizontal: 'center' };
        } else {
          // Student data columns
          cell.alignment = { horizontal: 'left' };
        }
      }
    });
  });

  // Freeze the first two rows and the first four columns
  worksheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 2 }];

  // Log export action
  logger.info(
    `Attendance exported for classId=${classId}, sectionId=${sectionId || 'N/A'}, students=${rows.length}, sections=${sections.length}, days=${uniqueDays.length}`
  );

  // Send the Excel file
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-${classId}${sectionId ? `-section-${sectionId}` : ''}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});
import { Response } from 'express';
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
  sectionNumber: string; // Changed from number to string
  students?: Types.ObjectId[];
}

interface AttendanceDocument extends Document {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  studentId: Student;
  status: string; // 'present', 'absent', 'late'
  dayNumber: number;
  recordedAt: Date;
}

interface AggregatedAttendanceStat {
  _id: Types.ObjectId; // studentId
  sectionsAttended: {
    sectionId: Types.ObjectId;
    dayNumber: number;
    status: string;
  }[];
  totalAttended: number;
  totalLate: number;
}

// --- Icon Definitions ---
const ICON_PRESENT = '✅';
const ICON_ABSENT = '❌';
const ICON_LATE = '🕒';
const ICON_NO_SECTION = '-';

// --- Color Definitions (ARGB format) ---
const COLOR_PRESENT_BG = 'FFC6EFCE'; // Light Green
const COLOR_ABSENT_BG = 'FFFFC7CE';  // Light Red
const COLOR_LATE_BG = 'FFFFEB9C';    // Light Yellow/Orange
const COLOR_HEADER_BG = 'FFD3D3D3';  // Light Grey
const COLOR_PRESENT_FONT = 'FF006100'; // Dark Green
const COLOR_ABSENT_FONT = 'FF9C0006';  // Dark Red
const COLOR_LATE_FONT = 'FF9C6500';    // Dark Yellow/Orange
const COLOR_DEFAULT_FONT = 'FF000000'; // Black
const COLOR_NO_SECTION_FONT = 'FF808080'; // Grey

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

  // Get unique dayNumbers from attendance records for the relevant sections
  const uniqueDays = await Attendance.distinct('dayNumber', {
    classId,
    sectionId: { $in: sectionIds },
  });
  uniqueDays.sort((a: number, b: number) => a - b);
  if (!uniqueDays.length) {
    uniqueDays.push(1);
    logger.warn(`No attendance days found for classId=${classId}, sectionId=${sectionId || 'all'}, defaulting to Day 1`);
  }

  // Aggregate attendance statistics
  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        classId: classDoc._id,
        sectionId: { $in: sectionIds },
        status: { $in: ['present', 'late'] }
      }
    },
    {
      $group: {
        _id: { studentId: '$studentId', sectionId: '$sectionId', dayNumber: '$dayNumber' },
        status: { $first: '$status' },
      },
    },
    {
      $group: {
        _id: '$_id.studentId',
        sectionsAttended: {
          $push: {
            sectionId: '$_id.sectionId',
            dayNumber: '$_id.dayNumber',
            status: '$status',
          },
        },
        totalAttended: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        totalLate: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
      },
    },
  ]) as AggregatedAttendanceStat[];

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance', {
      views: [{ state: 'frozen', xSplit: 4, ySplit: 2, activeCell: 'A1' }] // Freeze panes
  });

  // --- Header Rows ---
  // Main Headers
  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = 'Student Data';
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A1').font = { bold: true, size: 14 };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };

  const attendanceStartColIndex = 5; // Column E
  const totalColIndex = attendanceStartColIndex + uniqueDays.length;
  const percentageColIndex = totalColIndex + 1;
  const attendanceStartCol = String.fromCharCode(64 + attendanceStartColIndex);
  const attendanceEndCol = String.fromCharCode(64 + percentageColIndex);

  worksheet.mergeCells(`${attendanceStartCol}1:${attendanceEndCol}1`);
  worksheet.getCell(`${attendanceStartCol}1`).value = 'Class Attendance';
  worksheet.getCell(`${attendanceStartCol}1`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`${attendanceStartCol}1`).font = { bold: true, size: 14 };
  worksheet.getCell(`${attendanceStartCol}1`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };

  // Sub-Headers (Row 2)
  const headers = [
    'Student ID', 'Name', 'Email', 'Section',
    ...uniqueDays.map((day) => `Day ${day}`),
    'Total P+L', 'Attendance %',
  ];
  const headerRow = worksheet.getRow(2);
  headerRow.values = headers;
  headerRow.font = { bold: true, color: { argb: COLOR_DEFAULT_FONT } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };
  headerRow.border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } } // Thicker border below header
  };

  // --- Column Definitions ---
   const columnDefinitions: Partial<ExcelJS.Column>[] = [
    { key: 'studentId', width: 15, style: { alignment: { vertical: 'middle', horizontal: 'left' }, font: { color: { argb: COLOR_DEFAULT_FONT } }} },
    { key: 'name', width: 25, style: { alignment: { vertical: 'middle', horizontal: 'left' }, font: { color: { argb: COLOR_DEFAULT_FONT } }} },
    { key: 'email', width: 30, style: { alignment: { vertical: 'middle', horizontal: 'left' }, font: { color: { argb: COLOR_DEFAULT_FONT } }} },
    { key: 'sectionNumber', width: 10, style: { alignment: { horizontal: 'center', vertical: 'middle' }, font: { color: { argb: COLOR_DEFAULT_FONT } }} },
  ];
  uniqueDays.forEach((day) => {
      // Default style for day columns (centered icon)
      columnDefinitions.push({
          key: `day_${day}`, width: 7, // Slightly wider for icons
          style: { alignment: { horizontal: 'center', vertical: 'middle' }, font: { size: 12 } } // Larger font for icons
      });
  });
  columnDefinitions.push(
      { key: 'total', width: 10, style: { alignment: { horizontal: 'center', vertical: 'middle' }, font: { color: { argb: COLOR_DEFAULT_FONT } }} },
      { key: 'attendancePercentage', width: 12, style: { alignment: { horizontal: 'center', vertical: 'middle' }, numFmt: '0.00"%"', font: { color: { argb: COLOR_DEFAULT_FONT } }} }
  );
  worksheet.columns = columnDefinitions;


  // --- Add Student Data ---
  const rowsData: any[] = [];
  await Promise.all(
    classDoc.students.map(async (student: Student) => {
      const studentSections = sections.filter((s) =>
        s.students?.some((id) => id.toString() === student._id.toString())
      );
      const studentStats = attendanceStats.find((stat) => stat._id.toString() === student._id.toString());
      const attendedRecords = studentStats ? studentStats.sectionsAttended : [];
      const totalAttended = studentStats ? studentStats.totalAttended : 0;
      const totalLate = studentStats ? studentStats.totalLate : 0;
      const totalPresentOrLate = totalAttended + totalLate;
      const totalPossibleSessions = studentSections.length * uniqueDays.length;
      const attendancePercentageValue = totalPossibleSessions > 0
        ? (totalPresentOrLate / totalPossibleSessions) * 100
        : 0;

      const row: any = {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        sectionNumber: studentSections.length > 0 ? studentSections.map(s => s.sectionNumber).join(', ') : 'N/A',
        total: totalPresentOrLate,
        attendancePercentage: attendancePercentageValue / 100, // Store as decimal for % formatting
      };

      uniqueDays.forEach((day) => {
        const columnKey = `day_${day}`;
        if (studentSections.length === 0) {
          row[columnKey] = ICON_NO_SECTION; // Use '-' icon
        } else {
          const attendanceRecord = attendedRecords.find(
            (att) =>
              att.dayNumber === day &&
              studentSections.some(s => s._id.toString() === att.sectionId.toString())
          );

          // *** CHANGE HERE: Map status to ICONS ***
          if (attendanceRecord) {
            if (attendanceRecord.status === 'present') {
              row[columnKey] = ICON_PRESENT;
            } else if (attendanceRecord.status === 'late') {
              row[columnKey] = ICON_LATE;
            } else { // Should not happen, but default to Absent
               row[columnKey] = ICON_ABSENT;
            }
          } else { // No record means absent
            row[columnKey] = ICON_ABSENT;
          }
        }
      });
      rowsData.push(row);
    })
  );

  // Sort rows
  rowsData.sort((a, b) => {
      const getSortableSection = (sectionStr: string): number => {
          if (sectionStr === 'N/A') return Infinity;
          const firstSection = parseInt(sectionStr.split(',')[0], 10);
          return isNaN(firstSection) ? Infinity : firstSection;
      };
      const sectionA = getSortableSection(a.sectionNumber);
      const sectionB = getSortableSection(b.sectionNumber);
      if (sectionA === sectionB) return a.name.localeCompare(b.name);
      return sectionA - sectionB;
  });

  // Add sorted rows to worksheet and apply conditional styling
  rowsData.forEach((rowData) => {
    const addedRow = worksheet.addRow(rowData);

    addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Add standard thin borders to all data cells
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        // Apply background and font color based on ICON value in Day columns
        if (colNumber >= attendanceStartColIndex && colNumber < totalColIndex) { // Day columns
            const cellValue = cell.value?.toString();
            let fillColor = '';
            let fontColor = COLOR_DEFAULT_FONT;

            switch (cellValue) {
                case ICON_PRESENT:
                    fillColor = COLOR_PRESENT_BG;
                    fontColor = COLOR_PRESENT_FONT;
                    break;
                case ICON_ABSENT:
                    fillColor = COLOR_ABSENT_BG;
                    fontColor = COLOR_ABSENT_FONT;
                    break;
                case ICON_LATE:
                    fillColor = COLOR_LATE_BG;
                    fontColor = COLOR_LATE_FONT;
                    break;
                case ICON_NO_SECTION:
                     // No background, grey font
                     fontColor = COLOR_NO_SECTION_FONT;
                     break;
                // Keep default background/font for unexpected values
            }

            if (fillColor) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            }
            // Font color is set based on the switch, size/alignment from column definition
             cell.font = { ...cell.font, color: { argb: fontColor }, size: 12 }; // Ensure size 12 for icons
        } else if (colNumber === percentageColIndex) {
            // Ensure percentage format is applied correctly
            cell.numFmt = '0.00%';
        }
        // Alignment is handled by column definitions mostly
    });
  });


  // Log export action
  logger.info(
    `Attendance exported to Excel (with icons) for classId=${classId}, sectionId=${sectionId || 'all'}, students=${rowsData.length}, sections=${sections.length}, days=${uniqueDays.length}`
  );

  // Send the Excel file
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-icons-${classDoc._id}${sectionId ? `-section-${sectionId}` : '-allSections'}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});
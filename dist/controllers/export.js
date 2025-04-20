"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAttendance = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const attendance_1 = require("../models/attendance");
const class_1 = require("../models/class");
const section_1 = require("../models/section");
const asyncHandler_1 = require("../utils/asyncHandler");
const appError_1 = require("../utils/appError");
const logger_1 = __importDefault(require("../utils/logger"));
exports.exportAttendance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { classId, format } = req.query;
    if (!classId)
        throw new appError_1.AppError('Class ID is required', 400);
    if (format !== 'excel')
        throw new appError_1.AppError('Only Excel format is supported', 400);
    // Fetch class with students
    const classDoc = await class_1.Class.findById(classId)
        .populate('students', 'name email studentId')
        .exec();
    if (!classDoc)
        throw new appError_1.AppError('Class not found', 404);
    // Fetch sections and attendance records
    const sections = await section_1.Section.find({ classId }).sort({ sectionNumber: 1 }).exec();
    if (!sections.length)
        throw new appError_1.AppError('No sections found for this class', 404);
    const sectionIds = sections.map((s) => s._id);
    const attendanceRecords = await attendance_1.Attendance.find({ classId, sectionId: { $in: sectionIds } })
        .populate('studentId', 'name email studentId')
        .exec();
    // Get unique dayNumbers from attendance records
    const uniqueDays = await attendance_1.Attendance.distinct('dayNumber', {
        classId,
        sectionId: { $in: sectionIds },
    });
    uniqueDays.sort((a, b) => a - b);
    // Create workbook and worksheet
    const workbook = new exceljs_1.default.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');
    // Merge cells for main headers
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'Student Data';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    const attendanceStartCol = String.fromCharCode(69); // 'E'
    const attendanceEndCol = String.fromCharCode(69 + uniqueDays.length); // Includes Total column
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
    ];
    // Add student data
    const rows = [];
    classDoc.students.forEach((student) => {
        const studentSection = sections.find((s) => s.students?.some((id) => id.toString() === student._id.toString()));
        const studentAttendance = attendanceRecords.filter((record) => record.studentId._id.toString() === student._id.toString());
        const totalAttended = studentAttendance.filter((a) => a.status === 'present').length;
        const row = {
            studentId: student.studentId,
            name: student.name,
            email: student.email,
            sectionNumber: studentSection ? studentSection.sectionNumber : 'N/A',
            total: totalAttended,
        };
        uniqueDays.forEach((day) => {
            const columnKey = `day_${day}`;
            if (studentSection) {
                const attendance = studentAttendance.find((a) => a.sectionId.toString() === studentSection._id.toString() && a.dayNumber === day);
                row[columnKey] = attendance
                    ? attendance.status === 'present'
                        ? 'P'
                        : attendance.status === 'absent'
                            ? 'A'
                            : 'L'
                    : 'A'; // Default to absent if no record
            }
            else {
                row[columnKey] = '-';
            }
        });
        rows.push(row);
    });
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
                    cell.alignment = { horizontal: 'center' };
                    cell.font = {
                        color: { argb: cell.value === 'P' ? 'FF008000' : cell.value === 'A' ? 'FFFF0000' : 'FFA500' },
                    };
                }
                else {
                    cell.alignment = { horizontal: colNumber <= 4 ? 'left' : 'center' };
                }
            }
        });
    });
    // Freeze the first two rows and the first four columns
    worksheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 2 }];
    // Log export action
    logger_1.default.info(`Attendance exported for classId=${classId}, students=${classDoc.students.length}, sections=${sections.length},  days=${uniqueDays.length}`);
    // Send the Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
    await workbook.xlsx.write(res);
    res.end();
});

import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  codeId: mongoose.Types.ObjectId | null;
  classId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  dayNumber: number; // Add dayNumber
  location: {
    type: string;
    coordinates: [number, number];
  } | null;
  deviceInfo: {
    userAgent: string;
    ip: string;
    fingerprint: string;
  } | null;
  status: 'present' | 'absent' | 'late';
  recordedAt: Date;
}

const attendanceSchema: Schema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    codeId: {
      type: Schema.Types.ObjectId,
      ref: 'Code',
      required: false,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
    },
    dayNumber: {
      type: Number,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      fingerprint: String,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present',
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ location: '2dsphere' });
attendanceSchema.index(
  { studentId: 1, sectionId: 1, dayNumber: 1, 'deviceInfo.fingerprint': 1 },
  { unique: true, partialFilterExpression: { 'deviceInfo.fingerprint': { $exists: true } } }
);
attendanceSchema.index(
  { studentId: 1, sectionId: 1, dayNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      'deviceInfo.fingerprint': { $exists: false },
    },
  }
);


export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
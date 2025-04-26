import mongoose, { Schema, Document } from 'mongoose';

export interface ISection extends Document {
  classId: mongoose.Types.ObjectId;
  sectionNumber: number;
  students: mongoose.Types.ObjectId[];
  date: Date;
  dayNumber?: number;
}

const sectionSchema = new Schema<ISection>(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    sectionNumber: {
      type: Number,
      required: true,
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    date: {
      type: Date,
      required: true,
    },
  dayNumber: {
    type: Number,
    required: false,
  },
  },
  { timestamps: true }
);

// Unique index to prevent duplicate sectionNumber within the same classId
sectionSchema.index({ classId: 1, sectionNumber: 1 }, { unique: true });
sectionSchema.index({ classId: 1, students: 1 });

export const Section = mongoose.model<ISection>('Section', sectionSchema);
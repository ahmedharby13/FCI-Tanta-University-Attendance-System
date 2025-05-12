import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  name: string;
  teacherId: mongoose.Types.ObjectId;
  semester: string;
  status: 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
  students: mongoose.Types.ObjectId[];
  sections: mongoose.Types.ObjectId[];
}

const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sections: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Section',
      },
    ],
  },
  { timestamps: true }
);

export const Class = mongoose.model<IClass>('Class', classSchema);
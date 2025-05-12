import mongoose, { Schema, Document } from 'mongoose';

export interface ICode extends Document {
  code: string;
  expiresAt: Date;
  location: {
    type: string;
    coordinates: [number, number];
    name: string;
    radius: number;
  };
  classId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  dayNumber: number;
}

const codeSchema: Schema<ICode> = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      radius: {
        type: Number,
        default: 50,
      },
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    dayNumber: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
codeSchema.index({ sectionId: 1, isActive: 1 });
codeSchema.index({ isActive: 1, expiresAt: 1 });
codeSchema.index({ location: '2dsphere' });

export const Code = mongoose.model<ICode>('Code', codeSchema);
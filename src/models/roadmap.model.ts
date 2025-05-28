import mongoose, { Document, Schema, model } from 'mongoose';
import slugify from 'slugify';

export interface IRoadmap extends Document {
  title: string;
  slug?: string;
  description: string;
  longDescription?: string;
  category:
    | 'frontend'
    | 'backend'
    | 'devops'
    | 'mobile'
    | 'data-science'
    | 'design'
    | 'product-management'
    | 'cybersecurity'
    | 'cloud'
    | 'blockchain'
    | 'other';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedDuration?: {
    value: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
  };
  coverImage?: {
    public_id: string;
    url: string;
  };
  isFeatured?: boolean;
  isCommunityContributed?: boolean;
  contributor?: mongoose.Types.ObjectId;
  tags?: string[];
  prerequisites?: mongoose.Types.ObjectId[];
  stats?: {
    views: number;
    completions: number;
    averageRating: number;
    ratingsCount: number;
  };
  version?: number;
  isPublished?: boolean;
  publishedAt?: Date;
  lastUpdated?: Date;
  createdAt?: Date;
  updatedBy?: mongoose.Types.ObjectId;
}

const roadmapSchema = new Schema<IRoadmap>(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    slug: String,
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    longDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'frontend',
        'backend',
        'devops',
        'mobile',
        'data-science',
        'design',
        'product-management',
        'cybersecurity',
        'cloud',
        'blockchain',
        'other',
      ],
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },
    estimatedDuration: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days', 'weeks', 'months'],
        default: 'weeks',
      },
    },
    coverImage: {
      public_id: String,
      url: String,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isCommunityContributed: {
      type: Boolean,
      default: false,
    },
    contributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [String],
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Roadmap',
      },
    ],
    stats: {
      views: { type: Number, default: 0 },
      completions: { type: Number, default: 0 },
      averageRating: {
        type: Number,
        default: 4.5,
        min: 1,
        max: 5,
      },
      ratingsCount: { type: Number, default: 0 },
    },
    version: {
      type: Number,
      default: 1,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    lastUpdated: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
roadmapSchema.index({ title: 1 });
roadmapSchema.index({ slug: 1 });
roadmapSchema.index({ category: 1 });
roadmapSchema.index({ difficulty: 1 });
roadmapSchema.index({ tags: 1 });
roadmapSchema.index({ isFeatured: 1 });
roadmapSchema.index({ stats: 1 });

// Virtuals
roadmapSchema.virtual('nodes', {
  ref: 'RoadmapNode',
  localField: '_id',
  foreignField: 'roadmap',
  justOne: false,
});

roadmapSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'roadmap',
  justOne: false,
});

// Middleware
roadmapSchema.pre('save', function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

roadmapSchema.pre('save', function (next) {
  if (!this.isModified('isPublished') || !this.isPublished) return next();
  this.publishedAt = new Date();
  next();
});

roadmapSchema.pre(/^find/, function (next) {
  (this as mongoose.Query<any, any>).populate({
    path: 'contributor',
    select: 'username avatar',
  });
  next();
});

// Export
const Roadmap = model<IRoadmap>('Roadmap', roadmapSchema);
export default Roadmap;

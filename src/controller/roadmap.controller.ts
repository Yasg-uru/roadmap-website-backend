import { NextFunction, Request, Response } from "express";
import Roadmap from "../models/roadmap.model";
import mongoose from "mongoose";
import RoadmapNode from "../models/roadmap_node.model";

export const getRoadmapsPaginated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filters: any = { isPublished: true };

    if (req.query.category) {
      filters.category = req.query.category;
    }
    if (req.query.difficulty) {
      filters.difficulty = req.query.difficulty;
    }
    if (req.query.search) {
      filters.title = { $regex: req.query.search, $options: "i" };
    }

    const total = await Roadmap.countDocuments(filters);
    const roadmaps = await Roadmap.find(filters)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("contributor", "username avatar");

    res.status(200).json({
      page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      roadmaps,
    });
  } catch (error) {
    next(error);
  }
};
export const createRoadmap = async (req: Request, res: Response, next:NextFunction) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      title,
      description,
      longDescription,
      category,
      difficulty,
      estimatedDuration,
      coverImage,
      tags,
      prerequisites = [],
      isPublished,
      isFeatured,
      isCommunityContributed,
      nodes = [],
    } = req.body;

    const contributor = (req as any).user._id;

    // 1. Create Roadmap
    const roadmap = new Roadmap({
      title,
      description,
      longDescription,
      category,
      difficulty,
      estimatedDuration,
      coverImage,
      isPublished,
      isFeatured,
      isCommunityContributed,
      contributor,
      tags,
      prerequisites,
      lastUpdated: new Date(),
      updatedBy: contributor,
    });

    await roadmap.save({ session });

    // 2. Create Nodes (if any)
    const nodeDocs = nodes.map((node: any) => ({
      ...node,
      roadmap: roadmap._id,
      updatedBy: contributor,
    }));

    if (nodeDocs.length > 0) {
      await RoadmapNode.insertMany(nodeDocs, { session });
    }

    await session.commitTransaction();
    session.endSession();

    const fullRoadmap = await Roadmap.findById(roadmap._id)
      .populate("contributor", "username email profileUrl")
      .populate({
        path: "nodes",
        model: "RoadmapNode",
      });

    res.status(201).json({
      message: "Roadmap created successfully",
      roadmap: fullRoadmap,
    });
  } catch (err) {
    console.error("Error creating roadmap:", err);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Failed to create roadmap", error: err });
  }
};

import { NextFunction, Request, Response } from "express";
import Roadmap from "../models/roadmap.model";
import mongoose from "mongoose";
import RoadmapNode from "../models/roadmap_node.model";
import { reqwithuser } from "../middleware/auth.middleware";
import Errorhandler from "../util/Errorhandler.util";
import Review from "../models/review.model";
import "../models/resource.model";
import { error } from "console";
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
export const createRoadmap = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

export const getRoadmapDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { idOrSlug } = req.params;

    // Match either ID or slug
    const roadmap = await Roadmap.findOne(
      mongoose.Types.ObjectId.isValid(idOrSlug)
        ? { _id: idOrSlug }
        : { slug: idOrSlug }
    )
      .populate("contributor", "username avatar")
      .populate({
        path: "reviews",
        populate: { path: "user", select: "username avatar" },
      });

    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });
          console.error(error);
    // Fetch roadmap nodes
    const nodes = await RoadmapNode.find({ roadmap: roadmap._id })
      .populate({
        path: "resources",
        match: { isApproved: true },
        select: "-upvotes -downvotes",
      })
      .populate("dependencies prerequisites", "title _id")
      .sort({ depth: 1, position: 1 });

    // Optional: you can build a tree or flat list
    const buildTree = () => {
      const nodeMap: any = {};
      const roots: any[] = [];

      nodes.forEach(
        (node) =>
          (nodeMap[node._id.toString()] = { ...node.toObject(), children: [] })
      );
      nodes.forEach((node) => {
        node.dependencies?.forEach((dep: any) => {
          const parent = nodeMap[dep._id.toString()];
          if (parent) parent.children.push(nodeMap[node._id.toString()]);
        });
      });

      nodes.forEach((node) => {
        if (!node.dependencies?.length) {
          roots.push(nodeMap[node._id.toString()]);
        }
      });

      return roots;
    };

    const response = {
      roadmap,
      nodes: buildTree(),
    };

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};

export const updateRoadmapWithNodes = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roadmapId } = req.params;
    const { roadmapUpdates, nodes } = req.body;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) return next(new Errorhandler(404, "Roadmap not found"));

    // Basic update
    // Object.assign(roadmap, roadmapUpdates);
    
   if(roadmapUpdates && typeof roadmapUpdates === 'object'){
      for(const [key, value] of Object.entries(roadmapUpdates)){
          roadmap.set(key, value); 
      }
   }


    roadmap.version = (roadmap.version ?? 0) + 1;
    roadmap.lastUpdated = new Date();
    roadmap.updatedBy = (req.user as { _id: mongoose.Types.ObjectId })?._id;
    await roadmap.save();

    // Bulk update nodes
    if (Array.isArray(nodes)) {
      const bulkOps = nodes.map((node) => ({
        updateOne: {
          filter: { _id: node._id, roadmap: roadmapId },
          update: {
            $set: { ...node,
               updatedBy: req.user?._id,
                updatedAt: new Date(), 
              },
          },
        },
      }));
      await RoadmapNode.bulkWrite(bulkOps);
    }

 

  const updateRoadmap = await Roadmap.findById(roadmapId).populate("contributor", "username"); 
  const updatedNodes = await RoadmapNode.find({
     roadmap: roadmapId
  }); 

    res.status(200).json({
      success: true,
      message: "Roadmap and nodes updated successfully",
      roadmap:updateRoadmap,
      nodes:updatedNodes, 
    });
  } catch (error) {
    next(error);
  }
};
export const getRoadmapReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roadmapId } = req.params;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const sort =
      typeof req.query.sort === "string" ? req.query.sort : "-createdAt";
    const minRating = parseInt(req.query.minRating as string) || 1;
    const isVerified = req.query.isVerified === "true" ? true : undefined;

    // Filtering conditions
    const filter: any = {
      roadmap: roadmapId,
      rating: { $gte: minRating },
    };

    if (isVerified !== undefined) filter.isVerified = isVerified;

    // Query & paginate reviews
    const reviewsPromise = Review.find(filter)
      .sort(sort as string)
      .skip(skip)
      .limit(limit)
      .populate("user", "username avatar");

    // Count for pagination
    const countPromise = Review.countDocuments(filter);

    // Aggregated rating breakdown
    const ratingStatsPromise = Review.aggregate([
      { $match: { roadmap: new mongoose.Types.ObjectId(roadmapId) } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    const [reviews, total, ratingStats] = await Promise.all([
      reviewsPromise,
      countPromise,
      ratingStatsPromise,
    ]);

    const totalPages = Math.ceil(total / limit);

    const breakdown: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingStats.forEach((stat) => {
      breakdown[stat._id] = stat.count;
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      totalPages,
      breakdown,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};



// DELETE /roadmaps/:roadmapId
export const deleteRoadmap = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roadmapId } = req.params;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) return next(new Errorhandler(404, "Roadmap not found"));

    // Optionally: check ownership or admin role
    if (
     !req.user ||( roadmap.contributor?.toString() !== req.user._id.toString() && req.user.Role !== "admin"))
     {
      return next(new Errorhandler(403, "Unauthorized to delete roadmap"));
    }

    await RoadmapNode.deleteMany({ roadmap: roadmapId });
    await roadmap.deleteOne();

    res.status(200).json({ success: true, message: "Roadmap deleted successfully" });
  } catch (error) {
    next(error);
  }
};




// PATCH /roadmaps/:roadmapId
export const updateRoadmap = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roadmapId } = req.params;
    const updates = req.body;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) return next(new Errorhandler(404, "Roadmap not found"));

    if (
      !req.user ||(roadmap.contributor?.toString() !== req.user._id.toString() && req.user.Role !== "admin")
    ) {
      console.error(error);
      return next(new Errorhandler(403, "Unauthorized to update roadmap"));
    }

    Object.assign(roadmap, updates);
    roadmap.version = (roadmap.version ?? 0) + 1;
    roadmap.lastUpdated = new Date();
    roadmap.updatedBy = req.user._id;

    await roadmap.save();

    res.status(200).json({ success: true, message: "Roadmap updated", roadmap });
  } catch (err) {
    next(err);
  }
};



// PATCH /roadmaps/:id/publish

export const togglePublishRoadmap = async(
  req: reqwithuser, 
  res: Response, 
  next: NextFunction 
)  => {
    try{
       const{id} = req.params; 
       const {isPublished} = req.body; 

       const roadmap = await Roadmap.findById(id); 
       if(!roadmap) return next(new Errorhandler(404, "Roadmap not found")); 

       if(!req.user || req.user.Role !== "admin"){
          return next(new Errorhandler (403, "only main can publish/unpublish roadmaps")); 
       }

       roadmap.isPublished = isPublished; 
       roadmap.publishedAt = isPublished ? new Date() : undefined; 
       await roadmap.save();


       res.status(200).json({
          success: true, 
          message: `Roadmap ${isPublished ? "published" : "unpublished"} successfully`, 

       }); 
    } catch(err){
       next(err); 
    }
}; 

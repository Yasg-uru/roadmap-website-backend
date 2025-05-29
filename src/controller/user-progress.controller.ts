import { NextFunction, Response } from "express";
import { reqwithuser } from "../middleware/auth.middleware";
import catchAsync from "../middleware/catchasync.middleware";
import Errorhandler from "../util/Errorhandler.util";
import userProgressModel from "../models/user-progress.model";
import Roadmap from "../models/roadmap.model";
import RoadmapNode from "../models/roadmap_node.model";
import mongoose, { Types } from "mongoose";
import Notification from "../models/notification.model";
import { io } from "..";

export const getUserProgress = catchAsync(async (req: reqwithuser, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next(new Errorhandler(401, 'Authentication required'));
    }

    const userId = req.user._id;
    const { page = '1', limit = '10', status = 'all', sort = 'recent' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 50);

    if (isNaN(pageNum) || pageNum < 1) {
        return next(new Errorhandler(400, 'Invalid page number'));
    }

    if (isNaN(limitNum) || limitNum < 1) {
        return next(new Errorhandler(400, 'Invalid limit value'));
    }

    // Build the filter
    const filter: any = { user: userId };

    if (status === 'completed') {
        filter.isCompleted = true;
    } else if (status === 'in_progress') {
        filter.isCompleted = false;
    }

    // Sorting logic
    let sortOptions: any = {};

    switch (sort) {
        case 'progress':
            sortOptions = { 'stats.completionPercentage': -1 };
            break;
        case 'roadmap':
            sortOptions = { 'roadmap.title': 1 };
            break;
        case 'recent':
        default:
            sortOptions = { lastUpdated: -1 };
            break;
    }

    // Count total documents
    const total = await userProgressModel.countDocuments(filter);

    // Manual pagination
    const pages = Math.ceil(total / limitNum);
    const skip = (pageNum - 1) * limitNum;
    const hasNext = pageNum < pages;
    const hasPrev = pageNum > 1;

    const progressData = await userProgressModel.find(filter)
        .populate([
            {
                path: 'roadmap',
                select: 'title slug category coverImage stats estimatedDuration difficulty',
                populate: {
                    path: 'coverImage',
                    select: 'url'
                }
            },
            {
                path: 'currentNodes',
                select: 'title nodeType',
                perDocumentLimit: 3
            }
        ])
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();

 const transformedData = progressData.map(progress => {
    let roadmap: {
        _id: any;
        title?: string;
        slug?: string;
        category?: string;
        coverImage?: { url: string };
        stats?: any;
        estimatedDuration?: number;
        difficulty?: string;
    } = { _id: progress.roadmap };

    if (progress.roadmap && typeof progress.roadmap === 'object' && 'title' in progress.roadmap) {
        roadmap = progress.roadmap as typeof roadmap;
    }

    return {
        _id: progress._id,
        roadmap: {
            _id: roadmap._id,
            title: roadmap.title,
            slug: roadmap.slug,
            category: roadmap.category,
            coverImage: roadmap.coverImage?.url,
            stats: roadmap.stats,
            estimatedDuration: roadmap.estimatedDuration,
            difficulty: roadmap.difficulty
        },
        currentNodes: progress.currentNodes,
        stats: progress.stats,
        isCompleted: progress.isCompleted,
        startedAt: progress.startedAt,
        lastUpdated: progress.lastUpdated,
        completedAt: progress.completedAt
    };
});


    // Send response directly
    res.status(200).json({
        success: true,
        message: 'User progress retrieved successfully',
        data: transformedData,
        pagination: {
            total,
            page: pageNum,
            pages,
            limit: limitNum,
            hasNext,
            hasPrev
        }
    });
});



export const getRoadmapProgress = catchAsync(async (req: reqwithuser, res: Response, next: NextFunction) => {
    // Validate authenticated user
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userId = req.user._id;
    const roadmapId = req.params.roadmapId;

   
    // Try to get user progress
    const userProgress = await userProgressModel.findOne({ user: userId, roadmap: roadmapId })
        .populate([
            {
                path: 'roadmap',
                select: 'title slug description category difficulty estimatedDuration coverImage stats',
                populate: { path: 'coverImage', select: 'url' }
            },
            {
                path: 'nodes.node',
                select: 'title description nodeType depth position isOptional estimatedDuration metadata',
                populate: [
                    { path: 'resources', select: 'title url resourceType duration difficulty' },
                    { path: 'dependencies', select: 'title' }
                ]
            },
            {
                path: 'currentNodes',
                select: 'title description nodeType',
                populate: {
                    path: 'resources',
                    select: 'title url resourceType'
                }
            }
        ]);

    // If no user progress found
    if (!userProgress) {
        const roadmap = await Roadmap.findById(roadmapId)
            .select('title slug description category difficulty estimatedDuration coverImage stats')
            .populate('coverImage', 'url');

        if (!roadmap) {
            return res.status(404).json({ success: false, message: 'Roadmap not found' });
        }

        // Fetch nodes to count totals
        const nodes = await RoadmapNode.find({ roadmap: roadmapId })
            .select('resources')
            .populate('resources', '_id');

        const totalNodes = nodes.length;
        const totalResources = nodes.reduce((acc, node) => acc + (node.resources?.length || 0), 0);

        return res.status(200).json({
            success: true,
            message: 'Roadmap progress retrieved successfully',
            data: {
                roadmap,
                progress: {
                    stats: {
                        totalNodes,
                        completedNodes: 0,
                        completionPercentage: 0,
                        totalResources,
                        completedResources: 0
                    },
                    isCompleted: false,
                    startedAt: null,
                    lastUpdated: null,
                    completedAt: null,
                    nodes: [],
                    currentNodes: []
                }
            }
        });
    }

    // Process and transform user's progress nodes
    const transformedNodes = userProgress.nodes.map(nodeProgress => {
        const node = nodeProgress.node as any;

        return {
            _id: node._id,
            title: node.title,
            description: node.description,
            nodeType: node.nodeType,
            depth: node.depth,
            position: node.position,
            isOptional: node.isOptional,
            estimatedDuration: node.estimatedDuration,
            difficulty: node.metadata?.difficulty,
            importance: node.metadata?.importance,
            status: nodeProgress.status,
            startedAt: nodeProgress.startedAt,
            completedAt: nodeProgress.completedAt,
            notes: nodeProgress.notes,
            dependencies: (node.dependencies || []).map((d: any) => ({
                _id: d._id,
                title: d.title
            })),
            resources: (node.resources || []).map((resource: any) => {
                const resourceProgress = nodeProgress.resources?.find(
                    (r) => r.resource.toString() === resource._id.toString()
                );
                return {
                    _id: resource._id,
                    title: resource.title,
                    url: resource.url,
                    resourceType: resource.resourceType,
                    duration: resource.duration,
                    difficulty: resource.difficulty,
                    status: resourceProgress?.status || 'not_started',
                    completedAt: resourceProgress?.completedAt || null
                };
            })
        };
    });

    const transformedCurrentNodes = userProgress.currentNodes.map((node: any) => ({
        _id: node._id,
        title: node.title,
        description: node.description,
        nodeType: node.nodeType,
        resources: (node.resources || []).map((resource: any) => ({
            _id: resource._id,
            title: resource.title,
            url: resource.url,
            resourceType: resource.resourceType
        }))
    }));

    const responseData = {
        roadmap: typeof userProgress.roadmap === 'object' && 'title' in userProgress.roadmap && 'description' in userProgress.roadmap
            ? {
                _id: userProgress.roadmap._id,
                title: userProgress.roadmap.title,
                slug: (userProgress.roadmap as any).slug,
                description: (userProgress.roadmap as any).description,
                category: (userProgress.roadmap as any).category,
                difficulty: (userProgress.roadmap as any).difficulty,
                estimatedDuration: (userProgress.roadmap as any).estimatedDuration,
                coverImage: (userProgress.roadmap as any).coverImage?.url,
                stats: (userProgress.roadmap as any).stats
            }
            : { _id: userProgress.roadmap },
        progress: {
            stats: userProgress.stats,
            isCompleted: userProgress.isCompleted,
            startedAt: userProgress.startedAt,
            lastUpdated: userProgress.lastUpdated,
            completedAt: userProgress.completedAt,
            nodes: transformedNodes,
            currentNodes: transformedCurrentNodes
        }
    };

    return res.status(200).json({
        success: true,
        message: 'Roadmap progress retrieved successfully',
        data: responseData
    });
});


export const updateRoadmapProgress = catchAsync(async (req: reqwithuser, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { roadmapId } = req.params;
  const { nodes: nodeUpdates, currentNodes } = req.body;

  if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
    throw new Errorhandler(400, 'Invalid roadmap ID');
  }

  if (!nodeUpdates || !Array.isArray(nodeUpdates)) {
    throw new Errorhandler(400, 'Invalid node updates format');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let userProgress = await userProgressModel.findOne({ user: userId, roadmap: roadmapId }).session(session);

    const roadmapNodes = await RoadmapNode.find({ roadmap: roadmapId }).select('_id resources').session(session);
    const nodeMap = new Map<string, Types.ObjectId[]>();
    roadmapNodes.forEach((node) => nodeMap.set(node._id.toString(), node.resources || []));

    if (!userProgress) {
      userProgress = new userProgressModel({
        user: userId,
        roadmap: roadmapId,
        nodes: [],
        currentNodes: currentNodes || [],
        stats: {
          totalNodes: 0,
          completedNodes: 0,
          completionPercentage: 0,
          totalResources: 0,
          completedResources: 0
        }
      });
    }

    for (const update of nodeUpdates) {
      const nodeId = update.nodeId;
      if (!mongoose.Types.ObjectId.isValid(nodeId)) {
        throw new Errorhandler(400, `Invalid node ID: ${nodeId}`);
      }

      if (!nodeMap.has(nodeId)) {
        throw new Errorhandler(400, `Node ${nodeId} does not belong to this roadmap`);
      }

      let nodeProgress = userProgress.nodes.find(np => np.node.toString() === nodeId);

      if (!nodeProgress) {
        nodeProgress = {
          node: new mongoose.Types.ObjectId(nodeId),
          status: 'not_started',
          resources: []
        };
        userProgress.nodes.push(nodeProgress);
      }

      // Update node status
      if (update.status && ['not_started', 'in_progress', 'completed', 'skipped'].includes(update.status)) {
        nodeProgress.status = update.status;

        if (update.status === 'in_progress' && !nodeProgress.startedAt) {
          nodeProgress.startedAt = new Date();
        } else if (update.status === 'completed' && !nodeProgress.completedAt) {
          nodeProgress.completedAt = new Date();
        }
      }

      // Update notes
      if (update.notes !== undefined) {
        nodeProgress.notes = update.notes;
      }

      // Update resources
      if (update.resources && Array.isArray(update.resources)) {
        for (const resourceUpdate of update.resources) {
          const resourceId = resourceUpdate.resourceId;
          if (!mongoose.Types.ObjectId.isValid(resourceId)) {
            throw new Errorhandler(400, `Invalid resource ID: ${resourceId}`);
          }

          const allowedResources = nodeMap.get(nodeId);
          if (!allowedResources?.some(resId => resId.toString() === resourceId)) {
            throw new Errorhandler(400, `Resource ${resourceId} not found in node ${nodeId}`);
          }

          let resourceProgress = nodeProgress.resources?.find(r => r.resource.toString() === resourceId);

          if (!resourceProgress) {
            resourceProgress = {
              resource: new mongoose.Types.ObjectId(resourceId),
              status: 'not_started'
            };
            nodeProgress.resources = nodeProgress.resources || [];
            nodeProgress.resources.push(resourceProgress);
          }

          if (resourceUpdate.status && ['not_started', 'in_progress', 'completed', 'skipped'].includes(resourceUpdate.status)) {
            resourceProgress.status = resourceUpdate.status;
            if (resourceUpdate.status === 'completed' && !resourceProgress.completedAt) {
              resourceProgress.completedAt = new Date();
            }
          }
        }
      }
    }

    // Validate currentNodes
    if (currentNodes && Array.isArray(currentNodes)) {
      const validCurrentNodes = currentNodes.filter((id: string) =>
        roadmapNodes.some(node => node._id.equals(id))
      );
      userProgress.currentNodes = validCurrentNodes;
    }

    await userProgress.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populatedProgress = await userProgressModel.findById(userProgress._id)
      .populate([
        { path: 'roadmap', select: 'title slug' },
        { path: 'nodes.node', select: 'title description nodeType' },
        { path: 'currentNodes', select: 'title description nodeType' }
      ]);

    const progressUpdate = {
      roadmapId,
      stats: populatedProgress?.stats,
      currentNodes: populatedProgress?.currentNodes.map((node: any) => ({
        _id: node._id,
        title: node.title,
        description: node.description,
        nodeType: node.nodeType
      })),
      updatedAt: populatedProgress?.lastUpdated
    };

    io.to(`user_${userId}`).emit('progressUpdate', progressUpdate);

    if (
      populatedProgress?.stats &&
      typeof populatedProgress.stats.completionPercentage === 'number' &&
      populatedProgress.stats.completionPercentage >= 50 &&
      populatedProgress.stats.completionPercentage < 60
    ) {
      await Notification.create({
        user: userId,
        title: 'Halfway There!',
        message: `You've completed 50% of the "${(populatedProgress.roadmap as any)?.title || ''}" roadmap!`,
        type: 'progress',
        actionUrl: `/roadmaps/${roadmapId}`
      });
    } else if (populatedProgress?.isCompleted) {
      await Notification.create({
        user: userId,
        title: 'Roadmap Completed!',
        message: `Congratulations! You've completed the "${(populatedProgress.roadmap as any)?.title || ''}" roadmap!`,
        type: 'progress',
        actionUrl: `/roadmaps/${roadmapId}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        progress: populatedProgress
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});
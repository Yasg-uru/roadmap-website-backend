import { Request, Response } from "express";
import Resource from "../models/resource.model";

export const getAllResources = async (req: Request, res: Response) => {
  try {
    const { approved } = req.query;
    const query =
      approved !== undefined ? { isApproved: approved === "true" } : {};

    const resources = await Resource.find(query);
    res.status(200).json(resources);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching resouces",
      error: err,
    });
  }
};

export const getResourceById = async (req: Request, res: Response) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource)
      return res.status(404).json({
        message: "Resource not found",
      });

    res.status(200).json(resource);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching resource",
      error: err,
    });
  }
};

export const createResource = async (req: Request, res: Response) => {
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json({
      message: "Resource created",
      data: resource,
    });
  } catch (err) {
    res.status(400).json({
      message: "error creating resource",
      error: err,
    });
  }
};

export const updateResource = async (req: Request, res: Response) => {
  try {
    const updated = await Resource.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({
        message: "Resource not found",
      });
    res.status(200).json({
      message: "Resource updated ",
      data: updated,
    });
  } catch (err) {
    res.status(400).json({
      message: "Error updating resource ",
      error: err,
    });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  try {
    const deleted = await Resource.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({
        message: "Resource not found",
      });

    res.status(200).json({
      message: "Resource deleted",
    });
  } catch (err) {
    res.status(500).json({
      message: "Error deleting resource",
      error: err,
    });
  }
};

export const upvoteResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { userId } = req.body;

    const resource = await Resource.findById(resourceId);
    if (!resource)
      return res.status(404).json({
        message: "Resource not found",
      });
    resource.downvotes =
      resource.downvotes?.filter((id) => id.toString() !== userId) || [];
    if (!resource.upvotes?.some((id) => id.toString() === userId)) {
      resource.upvotes?.push(userId);
    }
    if (!resource.stats) {
      resource.stats = {};
    }

    resource.stats.rating = resource.calculateRating();
    await resource.save();

    res.status(200).json({
      message: "upvoted ",
      data: resource,
    });
  } catch (err) {
    res.status(400).json({
      message: "Error upvoting resource ",
      error: err,
    });
  }
};

export const downvoteResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { userId } = req.body;

    const resource = await Resource.findById(resourceId);
    if (!resource)
      return res.status(404).json({
        message: "Resource not found",
      });

    resource.upvotes =
      resource.upvotes?.filter((id) => id.toString() !== userId) || [];

    if (!resource.downvotes?.some((id) => id.toString() === userId)) {
      resource.downvotes?.push(userId);
    }

    if (!resource.stats) {
      resource.stats = {};
    }
    resource.stats.rating = resource.calculateRating();
    await resource.save();

    res.status(200).json({
      message: "Downvoted",
      data: resource,
    });
  } catch (err) {
    res.status(400).json({
      message: "Error downvoting resource",
      error: err,
    });
  }
};

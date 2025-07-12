import { Request, Response } from "express";
import mongoose from "mongoose";
import UserProgress from "../models/user-progress.model";
import { error } from "console";
import { MongoOIDCError } from "mongodb";
import userProgressModel from "../models/user-progress.model";

// get progress by user and roadmap

export const getUserProgress = async (req: Request, res: Response) => {
  try {
    const { userId, roadmapId } = req.params;

    const progress = await UserProgress.findOne({
      user: userId,
      roadmap: roadmapId,
    });

    if (!progress) {
      return res.status(404).json({ message: "Progress not found" });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};


// // update a specific node progress

export const updateNodeProgress = async (req: Request, res: Response) => {
  try {
    const { userId, roadmapId, nodeId } = req.params;
    const nodeUpdate = req.body;

    const progress = await UserProgress.findOne({
      user: new mongoose.Types.ObjectId(userId),
      roadmap: new mongoose.Types.ObjectId(roadmapId),
    });

    if (!progress) 
      return res.status(404).json({
        message: "Progress not found",
      });
    

    const node = progress.nodes.find((n) => n.node.toString() === nodeId);
    if (!node) {
      progress.nodes.push({
        node: nodeId,
        ...nodeUpdate,
      });
    } else {
      Object.assign(node, nodeUpdate);
    }

    await progress.save();

    res.json(progress);
  } catch (error) {
    console.error("failed to update node progress ", error); 
    res.status(500).json({
      message: "Server error",
      error,
    });
  }
};




export  const upsertUserProgress = async(req: Request, res:Response) =>{
      try{
          const {userId, roadmapId} = req.params; 
          const {completedNodes = []} =req.body; 

          const progress = await UserProgress.findOneAndUpdate({
              user : new mongoose.Types.ObjectId(userId), 
              roadmap: new mongoose.Types.ObjectId(roadmapId) 
          }, 
          {}, 
          {new :true, upsert: true, setDefaultsOnInsert: true} 
        
        ); 


        if(progress.nodes.length === 0 && completedNodes.length > 0){
           const validNodes = completedNodes.filter((id: any) => 
          mongoose.Types.ObjectId.isValid(id)   
        ); 

        const nodeProgress = validNodes.map((nodeId: any) => ({
              node: new mongoose.Types.ObjectId(nodeId), 
              status: 'completed', 
              startedAt: new Date(), 
              completedAt: new Date(), 
              resources: [] 
        })); 


        progress.nodes.push(...nodeProgress); 
        progress.markModified("nodes"); 

        }

        await progress.save(); 

        return res.json(progress); 
      } catch(error){
         console.error("Error in upsertUser progress",error); 
         return res.status(500).json({
             message: "server error", error 
         }); 
      }
}; 






// delete progress

export const deleteUserProgress = async (req: Request, res: Response) => {
  try {
    const { userId, roadmapId } = req.params;

    const result = await UserProgress.findOneAndDelete({
      user: userId,
      roadmap: roadmapId,
    });

    if (!result) {
      return res.status(404).json({
        message: "progress not found",
      });
    }

    res.json({
      message: "progress deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error,
    });
  }
};

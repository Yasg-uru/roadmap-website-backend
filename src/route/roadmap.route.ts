import { Router } from "express";
import { createRoadmap, getRoadmapDetails, getRoadmapReviews, getRoadmapsPaginated, updateRoadmapWithNodes } from "../controller/roadmap.controller";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";

const RoadmapRouter = Router();
RoadmapRouter.get('/roadmaps', getRoadmapsPaginated);
RoadmapRouter.post("/create", isAuthenticated, authorization(['admin']), createRoadmap);
RoadmapRouter.get('/roadmap/:idOrSlug', getRoadmapDetails);
RoadmapRouter.put('/:roadmapId', isAuthenticated, authorization(['admin']), updateRoadmapWithNodes);
RoadmapRouter.get('/reviews:/roadmapId', isAuthenticated, getRoadmapReviews);

export default RoadmapRouter;
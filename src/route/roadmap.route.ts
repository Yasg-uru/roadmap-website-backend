import { Router } from "express";
import { createRoadmap, getRoadmapDetails, getRoadmapsPaginated } from "../controller/roadmap.controller";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";

const RoadmapRouter = Router();
RoadmapRouter.get('/roadmaps', getRoadmapsPaginated);
RoadmapRouter.post("/create", isAuthenticated, authorization(['admin']), createRoadmap);
RoadmapRouter.get('/roadmap/:idOrSlug', getRoadmapDetails);

export default RoadmapRouter;
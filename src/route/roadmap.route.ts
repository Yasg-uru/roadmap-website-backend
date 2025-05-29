import { Router } from "express";
import { createRoadmap, getRoadmapsPaginated } from "../controller/roadmap.controller";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";

const RoadmapRouter = Router();
RoadmapRouter.get('/roadmaps', getRoadmapsPaginated);
RoadmapRouter.post("/create", isAuthenticated, authorization(['admin']), createRoadmap);

export default RoadmapRouter;
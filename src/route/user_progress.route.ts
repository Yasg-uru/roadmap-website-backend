import { Router } from "express";

import { isAuthenticated } from "../middleware/auth.middleware";
import { getRoadmapProgress, getUserProgress, updateRoadmapProgress } from "../controller/user-progress.controller";

const userProgressRoute = Router();

// GET /api/user-progress
userProgressRoute.get("/", isAuthenticated, getUserProgress);

// GET /api/user-progress/:roadmapId
userProgressRoute.get("/:roadmapId", isAuthenticated, getRoadmapProgress);

// PUT /api/user-progress/:roadmapId
userProgressRoute.put("/:roadmapId", isAuthenticated, updateRoadmapProgress);

export default userProgressRoute;

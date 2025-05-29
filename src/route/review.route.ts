import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import { createReview } from "../controller/review.controller";

const ReviewRouter = Router();
ReviewRouter.post("/:roadmmapId", isAuthenticated, createReview);

export default ReviewRouter;

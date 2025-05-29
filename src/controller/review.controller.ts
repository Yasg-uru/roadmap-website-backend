import { NextFunction, Response } from "express";
import { reqwithuser } from "../middleware/auth.middleware";
import Roadmap from "../models/roadmap.model";
import Review from "../models/review.model";
import Errorhandler from "../util/Errorhandler.util";

export const createReview = async (req: reqwithuser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id; 
    const {
      roadmapId,
      rating,
      title,
      review,
      pros,
      cons,
    } = req.body;

 

    // 2. Validate required fields
    if (!rating || !review) {
      return res.status(400).json({ message: 'Rating and review text are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    
    const roadmapExists = await Roadmap.exists({ _id: roadmapId });
    if (!roadmapExists) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    // 4. Create and save the review
    const newReview = await Review.create({
      roadmap: roadmapId,
      user: userId,
      rating,
      title,
      review,
      pros,
      cons,
      isVerified: true 
    });



 
    const populatedReview = await newReview.populate('user', 'username avatar');

    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: populatedReview
    });
  } catch (error: any) {
    // Handle duplicate review error from schema
    if (error.code === 11000 || error.message.includes('already reviewed')) {
      return res.status(400).json({ message: 'You have already reviewed this roadmap' });
    }

    next(error);
  }
};
export const updateReview = async (req: reqwithuser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id; // Injected from auth middleware
    const reviewId = req.params.id;
    if(!userId){
        return next(new Errorhandler(401, "Unauthorized access"))
    }
   
    // Fetch review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if current user is the owner
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this review' });
    }

    // Destructure and apply updatable fields
    const { rating, title, review: reviewText, pros, cons } = req.body;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      review.rating = rating;
    }

    if (title !== undefined) review.title = title;
    if (reviewText !== undefined) review.review = reviewText;
    if (pros !== undefined) review.pros = pros;
    if (cons !== undefined) review.cons = cons;

    review.updatedAt = new Date();

    await review.save(); // Triggers post-save hook to recalculate average rating

    const populated = await review.populate('user', 'username avatar');

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: reqwithuser, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id; // Provided by auth middleware
    const reviewId = req.params.id;
 if(!userId){
        return next(new Errorhandler(401, "Unauthorized access"))
    }
  
    const review = await Review.findById(reviewId);

    // Check existence
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check authorization
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this review' });
    }

    // Delete review
    await Review.findByIdAndDelete(reviewId); // Triggers post-delete hook to recalculate rating

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
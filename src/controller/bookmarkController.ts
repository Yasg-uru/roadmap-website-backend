import { Request, response, Response } from "express"; 
import Bookmark from "../models/book-mark.model";

export const getBookmarksByUser = async(req: Request, res: Response) => {
      try{
         const userId  = req.params.userId; 
         const bookmarks = await Bookmark.find({
              user: userId 
         }).populate('roadmap'); 
          res.status(200).json(bookmarks); 
      }  catch(err){
         res.status(500).json({
             message: 'Error fetching bookmarks', error: err 
         }); 
      }
}; 



export const upsertBookmark = async(req: Request, res: Response) => {
      try{
         const {user, roadmap, tags, notes, isFavorite} = req.body; 
          
         const bookmark = await Bookmark.findOneAndUpdate(
              {user, roadmap}, 
              {tags, notes, isFavorite, updatedAt: new Date()}, 
              {upsert: true, new: true, setDefaultsOnInsert: true

              }
         ); 
         res.status(200).json({
             message: 'Bookmark saved ', 
             data: bookmark 
         }); 
      }  catch(err){
          res.status(500).json({
             message: 'Error saving bookmark', 
             error: err 
          }); 
      }
}; 



export const deleteBookmark = async(req: Request, res: Response) => {
      try{
          const {userId, roadmapId} = req.params; 

          await Bookmark.findOneAndDelete({
             user: userId, 
             roadmap: roadmapId 
          });  
          res.status(200).json({
             message: 'Bookmark deleted successfully '
          }); 
      }  catch(err){
         res.status(500).json({
             message: 'Error deleting bookmarks', 
             error: err 
         }); 
      }
}; 


export const getFavoriteBookmarks = async(req: Request, res: Response) => {
      try{
         const {userId} = req.params; 

         const favorites = await Bookmark.find({
              user: userId, 
              isFavorite: true 
         }).populate('roadmap');  
         res.status(200).json(favorites); 
      }  catch(err){
         res.status(500).json({
            message: 'Error fetching favorites ', 
            error: err 
         }); 
      }
}; 



export const getBookmarksByTag = async(req: Request, res: Response) => {
      try{
          const {userId, tag} = req.params; 

          const bookmarks = await Bookmark.find({
              user: userId, 
              tags : tag 
          }).populate('roadmap'); 
          res.status(200).json(bookmarks); 
      }  catch(err){
         res.status(500).json({
             message: 'Error fetching messages by tag', 
             error: err 
         }); 
      }
}; 




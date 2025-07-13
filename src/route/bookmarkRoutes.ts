import express from 'express'; 
import  {getBookmarksByUser, upsertBookmark, deleteBookmark, getFavoriteBookmarks, getBookmarksByTag} from '../controller/bookmarkController';  
import Bookmark from '../models/book-mark.model';


const router = express.Router(); 

router.get('/:userId', getBookmarksByUser); 
router.post('/', upsertBookmark); 
router.delete('/:userId/:roadmapId', deleteBookmark);
router.get('/:userId/favorites', getFavoriteBookmarks); 
router.get('/:userId/tag/:tag', getBookmarksByTag); 


export default router; 


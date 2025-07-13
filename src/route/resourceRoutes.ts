import express from 'express'; 
import {getAllResources, getResourceById, createResource, updateResource, deleteResource, upvoteResource, downvoteResource} from '../controller/resourceController'; 

const router = express.Router(); 


router.get('/', getAllResources); 
router.get('/:id', getResourceById); 
router.post('/', createResource); 
router.patch('/:id', updateResource); 
router.delete('/:id', deleteResource);
router.patch('/:resourceId/upvote', upvoteResource); 
router.patch('/:resourceId/downvote', downvoteResource); 


export default router; 
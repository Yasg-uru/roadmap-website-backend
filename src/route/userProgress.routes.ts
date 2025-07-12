import express from 'express'; 

import { getUserProgress, upsertUserProgress, updateNodeProgress, deleteUserProgress } from '../controller/userProgress.controller';



const router = express.Router(); 


router.get("/user/:userId/roadmap/:roadmapId", getUserProgress); 
router.put("/user/:userId/roadmap/:roadmapId", upsertUserProgress); 
router.patch("/user/:userId/roadmap/:roadmpaId/node/:nodeId", updateNodeProgress); 
router.delete("/user/:userId/roadmap/:roadmapId", deleteUserProgress); 


export default router; 
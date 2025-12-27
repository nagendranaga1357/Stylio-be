import { Router } from 'express';
import { getAreas, getArea } from '../controllers/location.controller.js';

const router = Router();

router.get('/', getAreas);
router.get('/:id', getArea);

export default router;


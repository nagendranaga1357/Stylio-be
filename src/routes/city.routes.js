import { Router } from 'express';
import { getCities, getCity } from '../controllers/location.controller.js';

const router = Router();

router.get('/', getCities);
router.get('/:id', getCity);

export default router;


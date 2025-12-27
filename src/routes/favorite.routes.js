import { Router } from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
} from '../controllers/favorite.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getFavorites);
router.post('/', addFavorite);
router.post('/toggle', toggleFavorite);
router.delete('/:id', removeFavorite);

export default router;


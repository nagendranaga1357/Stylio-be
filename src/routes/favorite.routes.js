import { Router } from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  checkFavorite,
} from '../controllers/favorite.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getFavorites);
router.get('/check/:salonId', checkFavorite);
router.post('/', addFavorite);
router.post('/toggle', toggleFavorite);
router.delete('/:id', removeFavorite);

export default router;


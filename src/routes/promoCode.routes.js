import { Router } from 'express';
import {
  getPromoCodes,
  getPromoCode,
  validatePromoCode,
} from '../controllers/promoCode.controller.js';

const router = Router();

router.get('/', getPromoCodes);
router.get('/active', getPromoCodes); // Alias for mobile app compatibility
router.post('/validate', validatePromoCode);
router.get('/:code', getPromoCode);

export default router;


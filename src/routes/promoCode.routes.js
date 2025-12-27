import { Router } from 'express';
import {
  getPromoCodes,
  getPromoCode,
  validatePromoCode,
} from '../controllers/promoCode.controller.js';

const router = Router();

router.get('/', getPromoCodes);
router.post('/validate', validatePromoCode);
router.get('/:code', getPromoCode);

export default router;


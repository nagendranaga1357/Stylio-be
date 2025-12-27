import { Router } from 'express';
import {
  getProviders,
  getProvider,
  getProviderReviews,
  getProviderAvailability,
} from '../controllers/provider.controller.js';

const router = Router();

router.get('/', getProviders);
router.get('/:id', getProvider);
router.get('/:id/reviews', getProviderReviews);
router.get('/:id/availability', getProviderAvailability);

export default router;


import express from 'express';
import { renderInbox, markAllAsRead } from '../controllers/inboxController.js';

const router = express.Router();

router.get('/', renderInbox);
router.post('/read-all', markAllAsRead);

export default router;
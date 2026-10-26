const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  uploadAttachment,
  getAttachmentsByTask,
  downloadAttachment,
  deleteAttachment
} = require('../controllers/attachmentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/task/:taskId', upload.single('file'), uploadAttachment);
router.get('/task/:taskId', getAttachmentsByTask);
router.get('/:id/download', downloadAttachment);
router.delete('/:id', deleteAttachment);

module.exports = router;

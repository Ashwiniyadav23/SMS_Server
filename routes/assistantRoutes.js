const express = require('express')
const { chatWithAssistant, generateReport, listProviders } = require('../controllers/assistantController')
const assistantRateLimit = require('../middleware/assistantRateLimit')
const documentUpload = require('../middleware/documentUpload')
const { requireAuth } = require('../middleware/auth')
const { uploadDocument, listDocuments, deleteDocument } = require('../controllers/documentController')
const { getAdminUsage } = require('../controllers/usageController')
const { clearConversation } = require('../services/conversationService')
const asyncHandler = require('../middleware/asyncHandler')

const router = express.Router()

router.post('/chat', requireAuth, assistantRateLimit, asyncHandler(chatWithAssistant))
router.post('/reports', requireAuth, asyncHandler(generateReport))
router.get('/usage/admin', requireAuth, asyncHandler(getAdminUsage))
router.get('/providers', listProviders)
router.post('/documents', requireAuth, documentUpload.single('file'), asyncHandler(uploadDocument))
router.get('/documents', requireAuth, asyncHandler(listDocuments))
router.delete('/documents/:id', requireAuth, asyncHandler(deleteDocument))
router.delete('/conversation', requireAuth, asyncHandler(async (req, res) => {
  await clearConversation(req.user.sub)
  res.status(204).end()
}))

module.exports = router

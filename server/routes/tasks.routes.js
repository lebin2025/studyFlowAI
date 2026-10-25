import { Router } from 'express'
import { asyncHandler } from '../utils/httpError.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import {
  taskCreateSchema,
  taskIdParamSchema,
  taskListQuerySchema,
  taskToggleSchema,
  taskUpdateSchema,
} from '../schemas/task.schema.js'
import {
  createTask,
  deleteTask,
  getTaskRow,
  listTasks,
  toggleTask,
  updateTask,
} from '../services/task.service.js'
import { mapTask } from '../services/mappers.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  validate(taskListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await listTasks(req.user.id, req.validated.query))
  }),
)

router.post(
  '/',
  validate(taskCreateSchema),
  asyncHandler(async (req, res) => {
    const task = await createTask(req.user.id, req.validated.body)
    res.status(201).json({ task })
  }),
)

router.get(
  '/:id',
  validate(taskIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ task: mapTask(await getTaskRow(req.user.id, req.validated.params.id)) })
  }),
)

router.patch(
  '/:id',
  validate(taskIdParamSchema, 'params'),
  validate(taskUpdateSchema),
  asyncHandler(async (req, res) => {
    const task = await updateTask(req.user.id, req.validated.params.id, req.validated.body)
    res.json({ task })
  }),
)

router.patch(
  '/:id/toggle',
  validate(taskIdParamSchema, 'params'),
  validate(taskToggleSchema),
  asyncHandler(async (req, res) => {
    res.json(await toggleTask(req.user.id, req.validated.params.id, req.validated.body))
  }),
)

router.delete(
  '/:id',
  validate(taskIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    res.json(await deleteTask(req.user.id, req.validated.params.id))
  }),
)

export default router

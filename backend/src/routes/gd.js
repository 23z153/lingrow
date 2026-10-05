const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const GDRoom = require('../models/GDRoom');
const { evaluateGdSession } = require('../services/gdService');

// POST /api/gd/rooms — Teacher creates a new Group Discussion room
router.post('/rooms', requireAuth, async (req, res) => {
  try {
    const { topic, maxStudents, targetDurationMinutes } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const room = await GDRoom.create({
      topic: topic.trim(),
      teacher: req.user._id,
      maxStudents: Math.max(2, Math.min(10, parseInt(maxStudents, 10) || 4)),
      targetDurationMinutes: Math.max(1, Math.min(30, parseInt(targetDurationMinutes, 10) || 5)),
      status: 'LOBBY',
      participants: []
    });

    const populated = await GDRoom.findById(room._id).populate('teacher', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gd/rooms — List all active GD rooms (LOBBY, IN_PROGRESS, COMPLETED)
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const rooms = await GDRoom.find()
      .populate('teacher', 'name')
      .populate('participants', 'name email')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gd/rooms/:id — Get specific GD room status & participants
router.get('/rooms/:id', requireAuth, async (req, res) => {
  try {
    const room = await GDRoom.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('participants', 'name email')
      .populate('reports.student', 'name email');

    if (!room) return res.status(404).json({ error: 'GD Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gd/rooms/:id/join — Student enters into the lobby
router.post('/rooms/:id/join', requireAuth, async (req, res) => {
  try {
    const room = await GDRoom.findById(req.params.id).populate('participants', 'name email');
    if (!room) return res.status(404).json({ error: 'GD Room not found' });

    if (room.status === 'COMPLETED') {
      return res.status(400).json({ error: 'This Group Discussion session has already ended.' });
    }

    const userId = req.user._id.toString();
    const isAlreadyIn = room.participants.some((p) => p._id.toString() === userId);

    if (!isAlreadyIn) {
      if (room.participants.length >= room.maxStudents) {
        return res.status(400).json({ error: `Room lobby is full (${room.maxStudents} / ${room.maxStudents} students).` });
      }
      room.participants.push(req.user._id);
      await room.save();
    }

    const updated = await GDRoom.findById(room._id)
      .populate('teacher', 'name email')
      .populate('participants', 'name email');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gd/rooms/:id/leave — Student leaves the lobby
router.post('/rooms/:id/leave', requireAuth, async (req, res) => {
  try {
    const room = await GDRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'GD Room not found' });

    room.participants = room.participants.filter((p) => p.toString() !== req.user._id.toString());
    await room.save();
    res.json({ left: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gd/rooms/:id/start — Teacher starts the Group Discussion (transitions LOBBY -> IN_PROGRESS)
router.post('/rooms/:id/start', requireAuth, async (req, res) => {
  try {
    const room = await GDRoom.findById(req.params.id).populate('participants', 'name email');
    if (!room) return res.status(404).json({ error: 'GD Room not found' });

    room.status = 'IN_PROGRESS';
    room.startedAt = new Date();
    await room.save();

    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gd/rooms/:id/speech — Student records a speech contribution in the GD
router.post('/rooms/:id/speech', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Speech text is required' });
    }

    const room = await GDRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'GD Room not found' });

    room.transcripts.push({
      student: req.user._id,
      studentName: req.user.name || 'Student',
      text: text.trim(),
      timestamp: new Date()
    });

    await room.save();
    res.json({ success: true, transcripts: room.transcripts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gd/rooms/:id/end — End GD session & trigger local AI report evaluation
router.post('/rooms/:id/end', requireAuth, async (req, res) => {
  try {
    const room = await GDRoom.findById(req.params.id).populate('participants', 'name email');
    if (!room) return res.status(404).json({ error: 'GD Room not found' });

    const evaluatedRoom = await evaluateGdSession(room);
    const populated = await GDRoom.findById(evaluatedRoom._id)
      .populate('teacher', 'name email')
      .populate('participants', 'name email')
      .populate('reports.student', 'name email');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gd/rooms/:id/report — Retrieve GD session report for student and teacher
router.get('/rooms/:id/report', requireAuth, async (req, res) => {
  try {
    const room = await GDRoom.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('participants', 'name email')
      .populate('reports.student', 'name email');

    if (!room) return res.status(404).json({ error: 'GD Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

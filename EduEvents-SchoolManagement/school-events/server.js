/**
 * ============================================================
 *  EduEvents - School Event Management System
 *  Backend: Node.js + Express + MongoDB (Mongoose)
 *  Author: School Project
 * ============================================================
 */

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');

const app  = express();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Static files (uploads folder) ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Serve Frontend ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- MongoDB Connection ----
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eduevents', {
  useNewUrlParser:    true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ============================================================
//  MULTER - File Upload Config (banner images)
// ============================================================
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed!'));
  },
});

// ============================================================
//  MONGOOSE SCHEMAS & MODELS
// ============================================================

// -- Event Schema --
const eventSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  type:        { type: String, required: true,
                 enum: ['Sports Day','Annual Function','Hackathon',
                        'Science Exhibition','Cultural Fest','Workshop',
                        'Seminar','Competition','Other'] },
  date:        { type: String, required: true },   // ISO date string YYYY-MM-DD
  time:        { type: String, required: true },   // HH:MM
  venue:       { type: String, required: true, trim: true },
  organizer:   { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  maxPart:     { type: Number, default: null },
  deadline:    { type: String, default: null },
  status:      { type: String, default: 'Upcoming',
                 enum: ['Upcoming', 'Ongoing', 'Completed'] },
  banner:      { type: String, default: '' },  // file path
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

// -- Participant Schema --
const participantSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  cls:     { type: String, required: true },  // "Class 10"
  section: { type: String, required: true },  // "A"
  roll:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, trim: true, lowercase: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
}, { timestamps: true });

// Prevent duplicate registration (same roll + event)
participantSchema.index({ roll: 1, eventId: 1 }, { unique: true });

const Participant = mongoose.model('Participant', participantSchema);

// ============================================================
//  HELPER
// ============================================================
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================
//  EVENT ROUTES
// ============================================================

/**
 * GET /api/events
 * Query params: type, status, from, to, search
 */
app.get('/api/events', wrap(async (req, res) => {
  const { type, status, from, to, search } = req.query;
  const filter = {};

  if (type)   filter.type   = type;
  if (status) filter.status = status;
  if (search) filter.name   = { $regex: search, $options: 'i' };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to)   filter.date.$lte = to;
  }

  const events = await Event.find(filter).sort({ date: 1 });

  // Attach participant count to each event
  const withCounts = await Promise.all(events.map(async ev => {
    const count = await Participant.countDocuments({ eventId: ev._id });
    return { ...ev.toObject(), participantCount: count };
  }));

  res.json({ success: true, data: withCounts });
}));

/**
 * GET /api/events/:id
 */
app.get('/api/events/:id', wrap(async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });

  const participants = await Participant.find({ eventId: ev._id });
  res.json({ success: true, data: { ...ev.toObject(), participants } });
}));

/**
 * POST /api/events
 * Body: multipart/form-data (includes optional banner file)
 */
app.post('/api/events', upload.single('banner'), wrap(async (req, res) => {
  const { name, type, date, time, venue, organizer, description, maxPart, deadline, status } = req.body;

  if (!name || !type || !date || !time || !venue || !organizer) {
    return res.status(400).json({ success: false, message: 'Required fields missing' });
  }

  const ev = await Event.create({
    name, type, date, time, venue, organizer,
    description: description || '',
    maxPart:  maxPart  ? parseInt(maxPart)  : null,
    deadline: deadline || null,
    status:   status   || 'Upcoming',
    banner:   req.file  ? `/uploads/${req.file.filename}` : '',
  });

  res.status(201).json({ success: true, message: 'Event created', data: ev });
}));

/**
 * PUT /api/events/:id
 */
app.put('/api/events/:id', upload.single('banner'), wrap(async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });

  const fields = ['name','type','date','time','venue','organizer','description','maxPart','deadline','status'];
  fields.forEach(f => { if (req.body[f] !== undefined) ev[f] = req.body[f]; });

  if (req.file) {
    // Delete old banner file if it exists
    if (ev.banner) {
      const oldPath = path.join(__dirname, ev.banner);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    ev.banner = `/uploads/${req.file.filename}`;
  }

  await ev.save();
  res.json({ success: true, message: 'Event updated', data: ev });
}));

/**
 * DELETE /api/events/:id
 * Also removes related participants
 */
app.delete('/api/events/:id', wrap(async (req, res) => {
  const ev = await Event.findByIdAndDelete(req.params.id);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });

  // Cascade delete participants
  await Participant.deleteMany({ eventId: req.params.id });

  // Delete banner file if exists
  if (ev.banner) {
    const bannerPath = path.join(__dirname, ev.banner);
    if (fs.existsSync(bannerPath)) fs.unlinkSync(bannerPath);
  }

  res.json({ success: true, message: 'Event and participants deleted' });
}));

// ============================================================
//  PARTICIPANT ROUTES
// ============================================================

/**
 * GET /api/participants
 * Query: eventId (optional)
 */
app.get('/api/participants', wrap(async (req, res) => {
  const filter = req.query.eventId ? { eventId: req.query.eventId } : {};
  const parts = await Participant.find(filter).populate('eventId', 'name type date').sort({ createdAt: -1 });
  res.json({ success: true, data: parts });
}));

/**
 * GET /api/participants/:id
 */
app.get('/api/participants/:id', wrap(async (req, res) => {
  const p = await Participant.findById(req.params.id).populate('eventId', 'name');
  if (!p) return res.status(404).json({ success: false, message: 'Participant not found' });
  res.json({ success: true, data: p });
}));

/**
 * POST /api/participants
 */
app.post('/api/participants', wrap(async (req, res) => {
  const { name, cls, section, roll, email, eventId } = req.body;

  if (!name || !cls || !section || !roll || !email || !eventId) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  // Check event exists
  const ev = await Event.findById(eventId);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });

  // Check max participants
  if (ev.maxPart) {
    const count = await Participant.countDocuments({ eventId });
    if (count >= ev.maxPart) {
      return res.status(400).json({ success: false, message: 'Event has reached maximum participants' });
    }
  }

  const p = await Participant.create({ name, cls, section, roll, email, eventId });
  res.status(201).json({ success: true, message: 'Registered successfully', data: p });
}));

/**
 * PUT /api/participants/:id
 */
app.put('/api/participants/:id', wrap(async (req, res) => {
  const { name, cls, section, roll, email } = req.body;
  const p = await Participant.findByIdAndUpdate(
    req.params.id,
    { name, cls, section, roll, email },
    { new: true, runValidators: true }
  );
  if (!p) return res.status(404).json({ success: false, message: 'Participant not found' });
  res.json({ success: true, message: 'Participant updated', data: p });
}));

/**
 * DELETE /api/participants/:id
 */
app.delete('/api/participants/:id', wrap(async (req, res) => {
  const p = await Participant.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Participant not found' });
  res.json({ success: true, message: 'Registration removed' });
}));

// ============================================================
//  DASHBOARD STATS ROUTE
// ============================================================
app.get('/api/stats', wrap(async (req, res) => {
  const [total, upcoming, completed, ongoing, students] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ status: 'Upcoming' }),
    Event.countDocuments({ status: 'Completed' }),
    Event.countDocuments({ status: 'Ongoing' }),
    Participant.countDocuments(),
  ]);
  res.json({ success: true, data: { total, upcoming, completed, ongoing, students } });
}));

// ============================================================
//  AUTH ROUTE (simple demo auth)
// ============================================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, message: 'Login successful', token: 'demo-token-12345' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// ============================================================
//  SEED SAMPLE DATA ROUTE (for testing)
// ============================================================
app.post('/api/seed', wrap(async (req, res) => {
  await Event.deleteMany({});
  await Participant.deleteMany({});

  const today = new Date();
  const addDays = n => { const d=new Date(today); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; };

  const events = await Event.insertMany([
    { name:'Annual Science Exhibition', type:'Science Exhibition', date:addDays(10), time:'09:00', venue:'School Auditorium', organizer:'Dr. Patel', description:'Students showcase science projects.', maxPart:300, deadline:addDays(5), status:'Upcoming' },
    { name:'Inter-School Hackathon', type:'Hackathon', date:addDays(3), time:'10:00', venue:'Computer Lab Block A', organizer:'Mr. Verma', description:'24-hour coding challenge.', maxPart:100, deadline:addDays(1), status:'Upcoming' },
    { name:'Annual Sports Day', type:'Sports Day', date:addDays(20), time:'07:30', venue:'Main Ground', organizer:'Coach Singh', description:'Athletics and team sports.', maxPart:500, deadline:addDays(15), status:'Upcoming' },
    { name:'Cultural Fusion Fest', type:'Cultural Fest', date:addDays(-5), time:'11:00', venue:'Open Air Theatre', organizer:'Ms. Sharma', description:'Dance, music, drama.', maxPart:400, status:'Completed' },
    { name:'AI & Robotics Workshop', type:'Workshop', date:addDays(0), time:'14:00', venue:'Innovation Lab', organizer:'Ms. Kapoor', description:'Hands-on Arduino session.', maxPart:40, status:'Ongoing' },
  ]);

  await Participant.insertMany([
    { name:'Riya Sharma',  cls:'Class 10', section:'A', roll:'2024012', email:'riya@school.edu',  eventId:events[0]._id },
    { name:'Arjun Mehta', cls:'Class 11', section:'B', roll:'2024045', email:'arjun@school.edu', eventId:events[1]._id },
    { name:'Priya Nair',  cls:'Class 9',  section:'C', roll:'2024067', email:'priya@school.edu', eventId:events[2]._id },
  ]);

  res.json({ success: true, message: 'Sample data seeded successfully!' });
}));

// ============================================================
//  404 & ERROR HANDLERS
// ============================================================
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: 'Duplicate entry: already registered for this event' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ============================================================
//  START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 EduEvents server running at http://localhost:${PORT}`);
  console.log(`📊 API Base: http://localhost:${PORT}/api`);
});

const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config();

// Import the models
const User = require('./models/User');
const Exercise = require('./models/Exercise');

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define the /api/hello route to test
app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST route to create new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;

  // Check if username provided
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Create new user
  const newUser = new User({ username });

  // Save user to database
  newUser.save()
  .then(user => {
    res.json({
      username: user.username,
      _id: user._id
    });
  })
  .catch(err => {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  });
});

// Get route to retrieve all users
app.get('/api/users', (req, res) => {
  User.find()
    .then(users => {
      res.json(users);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve users' });
    });
});

// POST route to add exercises for a specific user
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  // Validate input fields
  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  // Set date to today's date if not provided
  const exerciseDate = date ? new Date(date) : new Date();

  // Create new exercise
  const newExercise = new Exercise({ 
    userId: _id,
    description,
    duration,
    date: exerciseDate
  });

  // Save exercise to database
  newExercise.save()
    .then(exercise => {
      // Ensure user object with exercise fields added
      User.findById(_id)
        .then(user => {
          res.json({
            username: user.username,
            _id: user._id,
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          });
        })
        .catch(err => {
          console.error(err);
          res.status(500).json({ error: 'Failed to retrieve user for exercise' });
        });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Failed to add exercise' });
    });
});

// GET route to retrieve exercises for a user
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  // Create filter for exercises based on the FROM & TO dates
  const filters = { userId: _id };

  if (from) {
    filters.date = { $gte: new Date(from) };
  }
  if (to) {
    filters.date = filters.date || {};
    filters.date.$lte = new Date(to);
  }

  // Convert limit to a number if provided
  const exerciseLimit = limit ? parseInt(limit) : null;

  // Find exercises with specified filters
  Exercise.find(filters)
    .limit(exerciseLimit)
    .exec()
    .then(exercises => {
      // Format exercises in the required structure
      const log = exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()  // Date in the string format
      }));

      // Return the user object with count & formatted log
      res.json({
        username: exercises[0]?.userId.username,  // Assuming the user is the same for all exercises
        _id,
        count: exercises.length,
        log: log
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Failed to retrieve exercises' });
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

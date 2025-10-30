const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/uber_clone', {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(() => console.log('Mongo connected'))
  .catch(err => console.error(err));

app.use('/auth', authRoutes);
app.use('/rides', rideRoutes);

// in-memory socket user map: userId -> socketId
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('register', (payload) => {
    // payload: { userId }
    userSockets.set(payload.userId, socket.id);
    console.log('registered', payload.userId, '->', socket.id);
  });

  socket.on('disconnect', () => {
    for (const [userId, sid] of userSockets.entries()) {
      if (sid === socket.id) {
        userSockets.delete(userId);
        console.log('deregistered', userId);
        break;
      }
    }
  });
});

// simple helper to emit to a user
const emitToUser = (userId, event, data) => {
  const sid = userSockets.get(userId);
  if (sid) io.to(sid).emit(event, data);
};

module.exports = { io, emitToUser, userSockets };

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server listening on', PORT));

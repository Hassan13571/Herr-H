import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`Ein Benutzer hat sich verbunden. Socket ID: ${socket.id}`);

  socket.on('createGame', (gameData) => {
    const gamePin = Math.floor(1000 + Math.random() * 9000).toString();

    socket.join(gamePin);

    socket.emit('gameCreated', { pin: gamePin, ...gameData });
    console.log(`Spiel ${gamePin} wurde erstellt.`);
  });

  socket.on('joinGame', ({ pin, playerName }) => {
    const roomExists = io.sockets.adapter.rooms.has(pin);

    if (roomExists) {
      socket.join(pin);
      io.to(pin).emit('playerJoined', { playerName, socketId: socket.id });
      socket.emit('joinedSuccessfully', { pin });
      console.log(`Spieler ${playerName} ist Spiel ${pin} beigetreten.`);
    } else {
      socket.emit('error', 'Spiel-Pin ungültig oder Spiel nicht gefunden.');
    }
  });

  socket.on('submitAnswer', (data) => {
    io.to(data.pin).emit('answerReceived', data);
    console.log(`Antwort von ${socket.id} in Spiel ${data.pin} empfangen.`);
  });

  socket.on('disconnect', () => {
    console.log(`Benutzer getrennt. Socket ID: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

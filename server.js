const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const path = require('path');
 
const db = new Database('chat.db');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    sender TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
 
const app = express();
const server = http.createServer(app);
const io = new Server(server);
 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
 
io.on('connection', (socket) => {
  console.log('Кто-то постучался в дверь...');
 
  socket.on('login', (data) => {
    const heroNumber = data.number; 
    const heroPassword = data.password; 
 
    // --- НАШ СПИСОК ГЕРОЕВ ---
    const usersDatabase = {
        '#1': { password: 'spidey', name: 'Питер Паркер' },
        '#2': { password: 'genius', name: 'Тони Старк' },
        '#3': { password: 'winter', name: 'Бакки Барнс' },
        '#4': { password: 'scarlet', name: 'Ванда Максимофф' },
        '#5': { password: 'ale', name: 'Тор Одинсон' },
        '#6': { password: 'forget', name: 'Нед Лидс' }
    };
 
    const user = usersDatabase[heroNumber];
 
    // --- ПРОВЕРКА ПАРОЛЯ ---
    if (user && user.password === heroPassword) {
      
      const heroName = user.name; 
      
      // Успешный вход
      socket.emit('login success', { name: heroName }); 
      console.log(`Вход разрешен: ${heroName}`);
 
      // 1. Загружаем историю сообщений
      try {
        const messages = db.prepare('SELECT * FROM messages ORDER BY id ASC LIMIT 50').all();
        socket.emit('chat history', messages);
      } catch (e) {
        console.error('Ошибка загрузки истории:', e);
      }
 
      // 2. Слушаем новые сообщения
      socket.on('chat message', (data) => {
        try {
          const insert = db.prepare('INSERT INTO messages (text, sender) VALUES (?, ?)');
          // ТУТ ИСПОЛЬЗУЕТСЯ heroName (имя того, кто вошел)
          const info = insert.run(data.text, heroName); 
          
          io.emit('chat message', {
            id: info.lastInsertRowid,
            text: data.text,
            sender: heroName, 
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.error('Ошибка сохранения:', e);
        }
      });
 
    } else {
      // Если пароль неверный (и ТОЛЬКО ТУТ эта строчка)
      socket.emit('login error', 'Доступ запрещен. Неверный номер или пароль.');
    }
  });
 
  socket.on('disconnect', () => {
    console.log('Пользователь отключился');
  });
});
 
server.listen(3000, '0.0.0.0', () => {
  console.log('Мессенджер работает на http://localhost:3000');
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
// AUMENTADO O LIMITE PARA 50MB PARA EVITAR ERROS DE UPLOAD (Necessário para a selfie)
app.use(express.json({ limit: '50mb' })); 

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- HELPER: UUID GENERATOR (Unique IDs) ---
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- DATABASE (In-Memory for Performance) ---
let users = [];
let rides = [];
let messages = [];
let systemErrors = []; 

// CONFIGURAÇÃO DE PREÇOS E TAXAS (Default)
let pricingRules = {
    moto: { basePrice: 4.50, pricePerKm: 0 }, 
    car: { basePrice: 7.00, pricePerKm: 0 },
    platformFee: 15 // Porcentagem padrão (15%)
};

// Opções de Recarga Padrão 
let rechargeOptions = [
    { id: 'opt-2', value: 2, qrCodeUrl: '' },
    { id: 'opt-4', value: 4, qrCodeUrl: '' },
    { id: 'opt-6', value: 6, qrCodeUrl: '' },
    { id: 'opt-8', value: 8, qrCodeUrl: '' },
    { id: 'opt-10', value: 10, qrCodeUrl: '' }
];

// --- REST API (Auth & Profile) ---

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === "jottanobru@gmail.com" && password === "40028922") {
      const admin = { id: 'admin-01', name: 'Administrador Supremo', email, role: 'ADMIN', status: 'ACTIVE' };
      return res.json({ success: true, user: admin });
  }

  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    // Verificações de Status
    if (user.status === 'BANNED') {
        return res.status(403).json({ success: false, message: 'Esta conta foi banida.' });
    }
    if (user.role === 'DRIVER' && user.status === 'PENDING') {
        return res.status(403).json({ success: false, message: 'Cadastro em análise. Aguarde aprovação.' });
    }
    if (user.status === 'REJECTED') {
        return res.status(403).json({ success: false, message: 'Cadastro recusado pelo administrador.' });
    }

    const { password, ...userWithoutPass } = user;
    res.json({ success: true, user: userWithoutPass });
  } else {
    res.status(401).json({ success: false, message: 'Credenciais inválidas' });
  }
});

// Signup
app.post('/api/signup', (req, res) => {
  // Destructuring updated fields
  const { name, email, password, role, vehicleType, vehiclePlate, vehicleColor, phone, cpf, photoUrl } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email já cadastrado' });
  }

  // Motoristas nascem PENDING, Passageiros ACTIVE
  const initialStatus = role === 'DRIVER' ? 'PENDING' : 'ACTIVE';

  const newUser = {
    id: generateUUID(),
    name,
    email,
    password, 
    role,
    status: initialStatus,
    phone: phone || null,
    cpf: cpf || null,
    vehicleType: role === 'DRIVER' ? vehicleType : null,
    vehiclePlate: role === 'DRIVER' ? vehiclePlate : null,
    vehicleColor: role === 'DRIVER' ? vehicleColor : null,
    photoUrl: photoUrl || null, // Salva a selfie
    rating: 5.0,
    earnings: 0,
    balance: 0, 
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  
  const { password: _, ...userResponse } = newUser;
  res.json({ success: true, user: userResponse });
  
  // Notifica admin em tempo real
  io.emit('admin-users-update', users.map(u => {
      const { password, ...rest } = u;
      return rest;
  }));
});

// Update Profile
app.post('/api/update-profile', (req, res) => {
    const { userId, data } = req.body;
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...data };
        const { password: _, ...updatedUser } = users[userIndex];
        res.json({ success: true, user: updatedUser });
    } else {
        res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
});

// --- ADMIN USER MANAGEMENT ---

// Get All Users
app.get('/api/admin/users', (req, res) => {
    const safeUsers = users.map(u => {
        const { password, ...rest } = u;
        return rest;
    });
    res.json({ success: true, users: safeUsers });
});

// Add Balance
app.post('/api/admin/add-balance', (req, res) => {
    const { userId, amount } = req.body;
    const userIndex = users.findIndex(u => u.id === userId || u.email === userId); 
    
    if (userIndex !== -1) {
        const currentBalance = users[userIndex].balance || 0;
        users[userIndex].balance = currentBalance + Number(amount);
        
        const { password: _, ...updatedUser } = users[userIndex];
        res.json({ success: true, user: updatedUser, newBalance: users[userIndex].balance });
    } else {
        res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }
});

// MODERATION: Approve Driver
app.post('/api/admin/approve-driver', (req, res) => {
    const { userId } = req.body;
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].status = 'ACTIVE';
        res.json({ success: true });
        io.emit('admin-users-update', users); // Atualiza lista
    } else {
        res.status(404).json({ success: false });
    }
});

// MODERATION: Reject Driver
app.post('/api/admin/reject-driver', (req, res) => {
    const { userId } = req.body;
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].status = 'REJECTED';
        res.json({ success: true });
        io.emit('admin-users-update', users);
    } else {
        res.status(404).json({ success: false });
    }
});

// MODERATION: Ban User
app.post('/api/admin/ban-user', (req, res) => {
    const { userId } = req.body;
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].status = 'BANNED';
        res.json({ success: true });
        io.emit('admin-users-update', users);
    } else {
        res.status(404).json({ success: false });
    }
});

// --- PRICING CONFIGURATION ---

app.get('/api/pricing', (req, res) => {
    res.json({ success: true, pricing: pricingRules });
});

app.post('/api/admin/pricing', (req, res) => {
    const { pricing } = req.body;
    if (pricing && pricing.moto && pricing.car) {
        pricingRules = { ...pricingRules, ...pricing };
        res.json({ success: true, pricing: pricingRules });
        // Opcional: Emitir evento para clientes atualizarem preços em tempo real
    } else {
        res.status(400).json({ success: false, message: 'Formato de preço inválido' });
    }
});


// --- ERROR REPORTING SYSTEM ---

app.post('/api/report-error', (req, res) => {
    const { errorMessage, componentStack, aiAnalysis } = req.body;
    const newError = {
        id: generateUUID(),
        errorMessage,
        componentStack,
        aiAnalysis,
        timestamp: Date.now()
    };
    systemErrors.unshift(newError); 
    if (systemErrors.length > 50) systemErrors.pop();
    
    res.json({ success: true });
});

app.get('/api/admin/errors', (req, res) => {
    res.json({ success: true, errors: systemErrors });
});

// --- RECHARGE API ---

// Get Options
app.get('/api/recharge-options', (req, res) => {
    res.json({ success: true, options: rechargeOptions });
});

// Update Option (Admin Only)
app.post('/api/update-recharge-option', (req, res) => {
    const { id, qrCodeUrl } = req.body;
    const index = rechargeOptions.findIndex(opt => opt.id === id);
    
    if (index !== -1) {
        rechargeOptions[index].qrCodeUrl = qrCodeUrl;
        res.json({ success: true, option: rechargeOptions[index] });
    } else {
        res.status(404).json({ success: false, message: 'Opção não encontrada' });
    }
});


// --- REAL-TIME SOCKET LOGIC (Rides & Chat) ---

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  socket.emit('sync-rides', rides.filter(r => r.status !== 'CANCELLED' && r.status !== 'COMPLETED'));

  socket.on('request-ride', (rideData) => {
    const newRide = {
      ...rideData,
      id: generateUUID(), 
      status: 'PENDING',
      timestamp: Date.now(),
      driverId: null
    };
    
    rides.push(newRide);
    io.emit('new-ride', newRide);
  });

  socket.on('accept-ride', ({ rideId, driverId }) => {
    // 1. Verificar se o motorista existe e tem saldo
    const driver = users.find(u => u.id === driverId);
    if (!driver) return;

    // VALIDAÇÃO FINANCEIRA: Saldo mínimo de R$ 2.00 para aceitar
    if ((driver.balance || 0) < 2) {
         // Opcional: Emitir erro específico para o socket do motorista (implementação simplificada aqui)
         return;
    }

    const rideIndex = rides.findIndex(r => r.id === rideId);
    if (rideIndex !== -1 && rides[rideIndex].status === 'PENDING') {
        rides[rideIndex].status = 'ACCEPTED';
        rides[rideIndex].driverId = driverId;
        io.emit('ride-updated', rides[rideIndex]);
    }
  });

  socket.on('update-ride-status', ({ rideId, status }) => {
      const rideIndex = rides.findIndex(r => r.id === rideId);
      if (rideIndex !== -1) {
          rides[rideIndex].status = status;
          
          // LÓGICA FINANCEIRA AO FINALIZAR CORRIDA
          if (status === 'COMPLETED') {
              const ride = rides[rideIndex];
              const driverId = ride.driverId;
              const driverIndex = users.findIndex(u => u.id === driverId);

              if (driverIndex !== -1) {
                  // CALCULA TAXA USANDO A PORCENTAGEM CONFIGURADA NO PAINEL ADMIN
                  const fee = ride.price * (pricingRules.platformFee / 100);
                  
                  // Desconta do saldo do motorista
                  users[driverIndex].balance = (users[driverIndex].balance || 0) - fee;
                  users[driverIndex].earnings = (users[driverIndex].earnings || 0) + ride.price;

                  // Emite atualização apenas para o motorista (ou admin)
                  io.emit('user-updated', { 
                      id: driverId, 
                      balance: users[driverIndex].balance,
                      earnings: users[driverIndex].earnings
                  });
                  // Emite update para admin dashboard
                  io.emit('admin-users-update', users);
              }
          }

          io.emit('ride-updated', rides[rideIndex]);
      }
  });

  socket.on('send-message', (msg) => {
      messages.push(msg);
      io.emit('receive-message', msg);
  });

  socket.on('typing', ({ rideId, userId }) => {
      socket.broadcast.emit('display-typing', { rideId, userId });
  });

  socket.on('update-location', (locationData) => {
      io.emit('driver-location-update', locationData);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`SERVIDOR ALEIXODRIVE RODANDO NA PORTA ${PORT}`);
});

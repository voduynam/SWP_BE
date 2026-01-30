const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join room based on role (Client should send role on connect/auth)
        socket.on('join_role', (role) => {
            socket.join(role);
            console.log(`Socket ${socket.id} joined room: ${role}`);
        });

        // Join room based on user ID
        socket.on('join_user', (userId) => {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room: ${userId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

const emitToRole = (role, event, data) => {
    if (io) {
        io.to(role).emit(event, data);
    }
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId).emit(event, data);
    }
};

module.exports = {
    initSocket,
    getIO,
    emitToRole,
    emitToUser
};

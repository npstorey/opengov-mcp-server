#!/usr/bin/env node

import * as http from 'http';

// Get the port from Render's environment variable, default to 8080 locally
const port = Number(process.env.PORT) || 8080;
// Define the host to listen on all interfaces
const host = '0.0.0.0';

// Create a simple HTTP request handler
const requestListener = function (req: http.IncomingMessage, res: http.ServerResponse) {
  console.log(`Received request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Render Health Check OK\n');
};

// Create the HTTP server
const server = http.createServer(requestListener);

// Start listening
server.listen(port, host, () => {
  // This is the crucial log message
  console.log(`🚀 Basic HTTP server listening on ${host}:${port}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1); // Exit on error
});

console.log('Attempting to start basic HTTP server...');

// Keep the process alive (useful for simple examples, might not be strictly needed on Render)
// process.stdin.resume(); // You can comment this out if preferred

// Graceful shutdown (optional but good practice)
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

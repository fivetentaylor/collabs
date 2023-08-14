#!/usr/bin/env node

const http = require("http");
const { WebSocketServer } = require("ws");
const {
  WebSocketNetworkServer,
} = require("../build/commonjs/src/web_socket_network_server");

const hostname = process.env.HOSTNAME || "localhost";
const port = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("collabs-ws-server");
});

const wss = new WebSocketServer({ server });
new WebSocketNetworkServer(wss);

server.listen(port, hostname, () => {
  console.log(`collabs-ws-server running at http://${hostname}:${port}/`);
});
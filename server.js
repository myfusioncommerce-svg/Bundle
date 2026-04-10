import { createRequestHandler } from "@react-router/express";
import express from "express";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// As per Render documentation for Node.js 502 errors
// https://render.com/docs/node-keepalive
httpServer.keepAliveTimeout = 120000;
httpServer.headersTimeout = 120000;

console.log("Setting keepAliveTimeout and headersTimeout to 120000ms");

const buildPath = "./build/server/index.js";

app.use(express.static("./build/client"));

const build = await import(buildPath);
app.all("*", createRequestHandler({
  build,
}));

const port = process.env.PORT || 10000;

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});

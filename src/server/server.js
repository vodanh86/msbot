const express = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const morgan = require("morgan");
const compression = require("compression");
const debug = require("debug");
const { MsTeamsApiRouter, MsTeamsPageRouter } = require("express-msteams-host");
require("dotenv").config();

const log = debug("msteams");
log("Initializing Microsoft Teams Express hosted App...");

// Load các thành phần Teams sau khi dotenv được init
const allComponents = require("./TeamsAppsComponents");

// Tạo ứng dụng Express
const app = express();
const port = process.env.port || process.env.PORT || 3007;

// Load chứng chỉ SSL
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "../certs/server.key")),
    cert: fs.readFileSync(path.join(__dirname, "../certs/server.cert"))
};

// Gắn raw body vào request (dùng trong việc verify chữ ký)
app.use(express.json({
    verify: (req, res, buf, encoding) => {
        req.rawBody = buf.toString();
    }
}));
app.use(express.urlencoded({ extended: true }));

// Cấu hình view
app.set("views", path.join(__dirname, "/"));

// Logging
app.use(morgan("tiny"));

// Gzip compression
app.use(compression());

// Static folder
app.use("/scripts", express.static(path.join(__dirname, "web/scripts")));
app.use("/assets", express.static(path.join(__dirname, "web/assets")));

// Router cho bot, webhook...
app.use(MsTeamsApiRouter(allComponents));

// Router cho tab, config UI
app.use(MsTeamsPageRouter({
    root: path.join(__dirname, "web/"),
    components: allComponents
}));

// Serve trang web chính
app.use("/", express.static(path.join(__dirname, "web/"), {
    index: "index.html"
}));

// Khởi chạy server HTTPS
https.createServer(sslOptions, app).listen(port, () => {
    log(`Server running on https://localhost:${port}`);
});

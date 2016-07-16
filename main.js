const electron = require('electron')
const express = require("express")

const app = electron.app
const webapp = express()

const BrowserWindow = electron.BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let displaySurface

app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        icon: "icon/256-alt.png"
    })

    mainWindow.loadURL(`file://${__dirname}/index.html`)

    mainWindow.on('closed', function() {
        mainWindow = null
    })
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function() {
    if (mainWindow === null) {
        createWindow()
    }
});

var shared = require("./shared.js");
exports.createDisplaySurface = function() {
    displaySurface = new BrowserWindow({ frame: false, icon: "icon/256-alt.png" });

    shared.setSurface(displaySurface);

    displaySurface.loadURL(`file://${__dirname}/surface.html`)

    displaySurface.on("closed", function() {
        displaySurface = null;
    })
}

webapp.use(express.static(__dirname + "/controller"));

webapp.listen(1359);
// requirements
const {
    app,
    BrowserWindow,
    shell
} = require('electron');
const ipc = require('electron').ipcMain;
const path = require('path');

// load window

const aboutWindow = require('./app/windows/aboutWindow');
const verifyWindow = require('./app/windows/verifyWindow');

// global const
const appName = 'pchecker';

// flags
global.indebug = true; // debug flag
global.isOS64 = true; // OS flag

// global vars
var mainWindow;

// single intance lock
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
    app.exit();
}

// auto updater
const {
    autoUpdater
} = require('electron-updater');
let feedUrl = `http://update.backrunner.top/` + appName + `/${process.platform}`;

if (isOS64) {
    feedUrl += `/x64`;
}

let checkForUpdates = () => {

    let sendUpdateMessage = (message, data) => {
        mainWindow.webContents.send('update-message', {
            message,
            data
        });
    };

    autoUpdater.setFeedURL(feedUrl);
    autoUpdater.autoDownload = false;

    ipc.on('downloadNow', function() {
        autoUpdater.downloadUpdate();
    });

    autoUpdater.on('error', function(message) {
        sendUpdateMessage('error', message);
    });

    autoUpdater.on('checking-for-update', function(message) {
        sendUpdateMessage('checking-for-update', message);
    });

    autoUpdater.on('update-available', function(message) {
        sendUpdateMessage('update-available', message);
    });

    autoUpdater.on('update-not-available', function(message) {
        sendUpdateMessage('update-not-available', message);
    });

    autoUpdater.on('download-progress', function(progressObj) {
        sendUpdateMessage('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', () => {
        sendUpdateMessage('update-downloaded');
    });

    autoUpdater.checkForUpdates();
};

// app

app.on('ready', () => {
    createMainWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('second-instance', () => {
    if (mainWindow != null) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
    } else {
        createMainWindow();
    }
});

// main window

function createMainWindow() {

    // conf of main window

    var conf = {
        width: 648,
        height: 362,
        resizable: false,
        maximizable: false,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    };

    // titlebar

    if (process.platform == 'darwin')
        conf.titleBarStyle = 'hiddenInset';
    else
        conf.frame = false;

    mainWindow = new BrowserWindow(conf);

    //load index page

    let viewpath = path.resolve(__dirname, './public/index.html');
    mainWindow.loadFile(viewpath);

    //event listener

    mainWindow.on('ready-to-show', () => {

        // main window ipc

        ipc.on('mainwindow-reload', () => {
            mainWindow.reload();
        });

        ipc.on('open-external-link', (e, url) => {
            shell.openExternal(url);
        });

        ipc.on('open-aboutwindow', () => {
            aboutWindow.create();
        });

        ipc.on('app-quitNow', ()=>{
            app.quit();
        });

        ipc.once('i18n-inited', ()=>{
            mainWindow.show();
            checkForUpdates();
        });

        ipc.on('hash-verify', () => {
            verifyWindow.create();
        });

        ipc.on('verify-result', (sender, input) => {
            mainWindow.send('verify-result', input);
        });
    });

    mainWindow.on('closed', () => {
        app.quit();
    });
}
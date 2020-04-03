const { menubar } = require('menubar');
const io = require('socket.io-client');
const { ipcMain, BrowserWindow, app } = require('electron');
const child = require('child_process').execFile;
const storage = require('electron-json-storage');

let macros = {}
    


const mb = new menubar({
    browserWindow: {
        height: 500,
        webPreferences: {
            nodeIntegration: true
        }
    }
});

const socket = io("https://stromdonk.herokuapp.com")

mb.on('ready', () => {
    console.log('init successful');
    storage.get('macros', (error, data) => {
        if (!error) {
            createMacroObject(data);
        } else {
            throw error;
        }
    })
    mb.showWindow()
    connect();
})

function connect() {
    socket.emit('initiate')
    socket.on('initiate-success', (data) => {
        handleConnect(data.userid)
    })
}

function createMacroObject(data) {
    //saves data as macros variable to escape this
    //idk i thought it was more legible this way
    macros = data;
}

function handleConnect(id) {
    console.log(id);
    mb.webContents.on('did-finish-load', (id) => {
        mb.window.send('code-ready', id)
    });
}

function createMacro(arg) {
    if (!macros[arg.cmd]) {
        macros[arg.cmd] = arg;
        saveAndSyncMacros(macros);
        mb.window.reload();
        mb.window.show();
        
    } else {
        throw "already exists";
    }
}

function run(macro) {
    child(macro.path)
    mb.window.send('toast', `<p style="color:white">Running ${macro.name}</p>`)
}

function saveAndSyncMacros(macros) {
    storage.set('macros', macros);
    socket.emit('send-macros', JSON.stringify(macros));
}

socket.on('mobile-initiate-success', () => {
    console.log('connection established')
    mb.window.loadURL(`file://${__dirname}/macros.html`);
})

socket.on('disconnect', () => {
    console.log('connection lost')
    app.quit();
})

socket.on('partner-disconnect', () => {
    socket.disconnect();
    console.log('connection lost')
    app.quit();
})

socket.on('command', (data) => {
    run(macros[data.command])
})

socket.on('request-macros', () => {
    console.log('Macros requested');
    socket.emit('send-macros', JSON.stringify(macros));
})

ipcMain.on('macros', (event, arg) => {
    event.reply('macro-success', macros)
})

ipcMain.on('run', (event, arg) => {
    run(macros[arg]);
})

ipcMain.on('create-macro', (event, arg) => {
    createMacro(arg)
    console.log(arg)
})

ipcMain.on('delete-macro', (event, arg) => {
    delete macros[arg];
    saveAndSyncMacros(macros);
    mb.window.reload();
})

ipcMain.on('open-creator', (event, arg) => {
    let win = new BrowserWindow({ width: 600, height: 330, webPreferences: {
        nodeIntegration: true
    } });
    win.on('close', function () { win = null })
    win.loadURL(`file://${__dirname}/create.html`)
    win.show()
})





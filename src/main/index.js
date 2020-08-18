'use strict'

import { app, BrowserWindow } from 'electron'
import path from 'path';
import { menubar } from 'menubar';

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  let mb = menubar({
    index: winURL + '/#/menu',
    icon: path.resolve(__dirname, '../assets/menu.png'),
    // tooltip: 'MyApp',
    // width: 350,
    // height: 460,
    // fullscreenable: true,
    // resizable: false,
    // transparent: true,
    // webPreferences: {
    //   backgroundThrottling: false,
    // },
    // alwaysOnTop: true,
    // showOnAllWorkspaces: false,
    // preloadWindow: true,
  });

  mb.on('after-create-window', () => {
    // mb.window.webContents.openDevTools({ mode: 'undocked' });
  });
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */

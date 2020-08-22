'use strict'

import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  clipboard,
  Notification,
} from 'electron'
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow

let tray
let uploadDir = '';
let repoPath = '';
const imgList = [];

const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`;

const triggerNotify = ({ title, body }) => {
  const notify = new Notification({
    title,
    body
  });
  notify.show();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const initMenubar = () => {
  // menubar 操作逻辑
  tray = new Tray(path.resolve(__dirname, '../assets/icon@3x.png'));

  tray.on('click', () => {
    const more = {
      label: '更多',
      type: 'submenu',
      submenu: [
        { label: '退出', type: 'normal', click: () => { app.quit(); } },
      ],
    };
    const clipboardImage = clipboard.readImage();

    if (clipboardImage && !clipboardImage.isEmpty()) {
      const ratio = clipboardImage.getAspectRatio();
      const img = clipboardImage.resize({
        width: 100,
        height: ratio / 100,
      });
      imgList.push({
        img,
        raw: clipboardImage,
        click: async () => {
          const originPath = clipboard.read('public.file-url');
          if (originPath) {
            const name = path.basename(originPath);
            const filePath = (uploadDir || repoPath) + '/' + name;
            try {
              fs.copyFileSync(originPath.replace('file://', ''), filePath);
              const git = simpleGit({
                baseDir: repoPath,
                binary: 'git',
                maxConcurrentProcesses: 6,
              });
              await git.add(filePath);
              await git.commit(`feat: add file ${name}`);
              await git.push();
              triggerNotify({
                title: '上传成功',
                body: '👍'
              })
            } catch (e) {
              triggerNotify({
                title: '上传失败',
                body: '请重试'
              })
            }
          } else {
            const buffer = clipboardImage.toPNG();
            const d = new Date();
            const name = d.getTime() + '.png';
            const filePath = (uploadDir || repoPath) + '/' + name;
            await fs.writeFile(filePath, buffer);
          }
        }
      })
    }
    const menus = [
      {
        label: '',
        type: 'separator'
      },
      {
        label: '设置/上传',
        type: 'normal',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
          } else {
            createWindow();
          }
        }
      },
      {
        label: '清空',
        type: 'normal',
        enabled: imgList.length > 0,
        click: () => {
          imgList.splice(0, imgList.length);
          // const notify = new Notification({
          //   title: '通知',
          //   body: '清空'
          // });
          // notify.show();
        }
      },
      more
    ];
    if (imgList.length) {
      imgList.map((item, index) => {
        menus.unshift({
          label: (index + 1).toString(),
          icon: item.img,
          type: 'normal',
          click: item.click
        })
      });
    }
    if (!uploadDir) {
      menus.unshift({
        label: '暂未设置存储路径',
        type: 'normal',
        enabled: false
      })
    }
    const contextMenu = Menu.buildFromTemplate(menus);
    tray.popUpContextMenu(contextMenu);
  })

  ipcMain.on('onRepoPathChange', (sys, dir) => {
    repoPath = dir
  })
  ipcMain.on('onUploadDirChange', (sys, dir) => {
    uploadDir = dir
  })
}

const initWindow = () => {
  createWindow();
  initMenubar();
}

app.on('ready', initWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    initWindow()
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

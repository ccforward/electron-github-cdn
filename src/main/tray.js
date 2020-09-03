import {
  app,
  Menu,
  Tray,
  ipcMain,
  clipboard,
  nativeImage,
} from 'electron'
import path from 'path';
import fs from 'fs';
import {
  getCDNUrl,
  upload,
  triggerNotify,
} from '../utils';

let tray;
let uploadDir = '';
let repoPath = '';
const imgList = [];

export default function initMenubar (iconPath, mainWindow, createWindow) {
  const icon = nativeImage.createFromPath(iconPath).resize({
    width: 16,
    height: 16,
  });
  // menubar 操作逻辑
  tray = new Tray(icon);

  tray.on('click', () => {
    const more = {
      label: '更多',
      type: 'submenu',
      submenu: [{
        label: '退出',
        type: 'normal',
        click: () => {
          app.quit();
        }
      }, ],
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
          let ret = false;
          let filePath = '';
          const originPath = clipboard.read('public.file-url');
          if (originPath) {
            const fileName = path.basename(originPath);
            filePath = (uploadDir || repoPath) + '/' + fileName;
            fs.copyFileSync(originPath.replace('file://', ''), filePath);
            ret = await upload({
              repoPath,
              filePath,
              fileName,
            });
          } else {
            const buffer = clipboardImage.toPNG();
            const d = new Date();
            const fileName = d.getTime() + '.png';
            filePath = (uploadDir || repoPath) + '/' + fileName;
            fs.writeFileSync(filePath, buffer);
            ret = await upload({
              repoPath,
              filePath,
              fileName,
            });
          }
          if (ret) {
            const fileUrl = filePath.replace(repoPath, getCDNUrl(repoPath));
            clipboard.writeText(fileUrl);
            return triggerNotify({
              title: '上传成功',
              body: '👍'
            });
          }
          filePath && fs.unlinkSync(filePath);
          triggerNotify({
            title: '上传失败',
            body: '请重试'
          })
        }
      })
    }
    const menus = [{
      label: '',
      type: 'separator'
    }, {
      label: '设置/上传',
      type: 'normal',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        } else {
          createWindow();
        }
      }
    }, {
      label: '清空',
      type: 'normal',
      enabled: imgList.length > 0,
      click: () => {
        imgList.splice(0, imgList.length);
      }
    }, more ];
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

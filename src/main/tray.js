import {
  app,
  Menu,
  Tray,
  ipcMain,
  clipboard,
  nativeImage,
} from 'electron'
import Store from 'electron-store';
import path from 'path';
import fs from 'fs';
import {
  getCDNUrl,
  upload,
  ftpUpload,
  triggerNotify,
} from '../utils';

let tray;
let uploadDir = '';
let repoPath = '';
let useFtp = false;
let disableFtp = false;
const imgList = [];
const store = new Store();

export default function initMenubar (iconPath, showWindow) {
  const icon = nativeImage.createFromPath(iconPath).resize({
    width: 16,
    height: 16,
  });
  // menubar 操作逻辑
  tray = new Tray(icon);

  tray.on('click', () => {
    const ftpData = store.get('ftpData');
    const {
      ftpHost,
      ftpUser,
      ftpPassword,
      httpHost: ftpHttpHost,
      folder: ftpFolder,
    } = ftpData;

    if (!ftpHost || !ftpUser || !ftpPassword) {
      disableFtp = true
    }

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
          let fileName = '';
          const originPath = clipboard.read('public.file-url');
          // 上传本地图片
          if (originPath) {
            fileName = path.basename(originPath);
            if (useFtp) {
              ret = await ftpUpload({
                filePath: originPath.replace('file://', ''),
                fileName,
                host: ftpHost,
                user: ftpUser,
                password: ftpPassword,
                folder: ftpFolder,
              });
            } else {
              filePath = (uploadDir || repoPath) + '/' + fileName;
              fs.copyFileSync(originPath.replace('file://', ''), filePath);
              ret = await upload({
                repoPath,
                filePath,
                fileName,
              });
            }
          } else {
            // 上传截图
            const buffer = clipboardImage.toPNG();
            const d = new Date();
            fileName = d.getTime() + '.png';
            if (useFtp) {
              const tempFilePath = app.getPath('temp') + fileName
              fs.writeFileSync(tempFilePath, buffer);
              ret = await ftpUpload({
                filePath: tempFilePath,
                fileName,
                host: ftpHost,
                user: ftpUser,
                password: ftpPassword,
                folder: ftpFolder,
              });
            } else {
              filePath = (uploadDir || repoPath) + '/' + fileName;
              fs.writeFileSync(filePath, buffer);
              ret = await upload({
                repoPath,
                filePath,
                fileName,
              });
            }
          }
          if (ret) {
            let fileUrl = '';
            if (useFtp) {
              const folder = ftpFolder ? ftpFolder + '/' : '';
              fileUrl = ftpHttpHost + '/' + folder + fileName
            } else {
              fileUrl = filePath.replace(repoPath, getCDNUrl(repoPath));
            }
            clipboard.writeText(fileUrl);
            return triggerNotify({
              title: '上传成功',
              body: '👍'
            });
          }
          // 失败 删除已经复制的文件
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
        showWindow();
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
    if (!useFtp && !uploadDir) {
      menus.unshift({
        label: '暂未设置存储路径',
        type: 'normal',
        enabled: false
      })
    }

    if (useFtp) {
      if (disableFtp) {
        menus.unshift({
          label: '暂未设置FTP',
          type: 'normal',
          enabled: false
        })
      }
      menus.unshift({
        label: '正在使用FTP！！',
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

  ipcMain.on('onFtpChange', (sys, isFtp) => {
    useFtp = isFtp
  })
}

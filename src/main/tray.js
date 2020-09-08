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
let isUsingFtp = false; // FTP 是否打开
let disableFtp = false;
const imgList = [];
const localFileList = [];
const store = new Store();

const uploadImg = async ({
  clipboardImage,
  ftpHost,
  ftpUser,
  ftpPassword,
  ftpHttpHost,
  ftpFolder,
  originPath,
}) => {
  let ret = false;
  let filePath = '';
  let fileName = '';
  // 上传本地图片
  if (originPath) {
    fileName = path.basename(originPath);
    const realPath = decodeURIComponent(originPath.replace('file://', ''));
    if (isUsingFtp) {
      ret = await ftpUpload({
        filePath: realPath,
        fileName,
        host: ftpHost,
        user: ftpUser,
        password: ftpPassword,
        folder: ftpFolder,
      });
    } else {
      filePath = (uploadDir || repoPath) + '/' + fileName;
      fs.copyFileSync(realPath, filePath);
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
    if (isUsingFtp) {
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
    if (isUsingFtp) {
      const folder = ftpFolder ? ftpFolder + '/' : '';
      fileUrl = ftpHttpHost + '/' + folder + fileName
    } else {
      fileUrl = filePath.replace(repoPath, getCDNUrl(repoPath));
    }
    clipboard.writeText(fileUrl);
    return triggerNotify({
      title: '上传成功',
      body: fileUrl
    });
  }
  // 失败 删除已经复制的文件
  filePath && fs.unlinkSync(filePath);
  triggerNotify({
    title: '上传失败',
    body: '请重试'
  })
}

const uploadLocalFile = async ({
  ftpHost,
  ftpUser,
  ftpPassword,
  ftpHttpHost,
  ftpFolder,
  originPath,
}) => {
  let ret = false;
  let fileName = path.basename(originPath);
  ret = await ftpUpload({
    filePath: decodeURIComponent(originPath.replace('file://', '')),
    fileName,
    host: ftpHost,
    user: ftpUser,
    password: ftpPassword,
    folder: ftpFolder,
  });
  if (ret) {
    let fileUrl = '';
    const folder = ftpFolder ? ftpFolder + '/' : '';
    fileUrl = ftpHttpHost + '/' + folder + fileName
    clipboard.writeText(fileUrl);
    return triggerNotify({
      title: '上传成功',
      body: fileUrl
    });
  }
  triggerNotify({
    title: '上传失败',
    body: '请重试'
  })
}

export default function initMenubar (iconPath, showWindow) {
  if (tray) return;
  const icon = nativeImage.createFromPath(iconPath).resize({
    width: 16,
    height: 16,
  });
  // menubar 操作逻辑
  tray = new Tray(icon);

  tray.on('click', () => {
    const ftpData = store.get('ftpData') || {};
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
      }],
    };

    const clipboardImage = clipboard.readImage();
    const originPath = clipboard.read('public.file-url');
    let isLocalFile = false;
    let filePath = '';
    if (originPath) {
      filePath = decodeURIComponent(originPath.replace('file://', ''));
      const stat = fs.lstatSync(filePath);
      isLocalFile = stat.isFile();
    }
    const isImg = !clipboardImage.isEmpty();

    // 上传非图片文件(FTP)
    if (isLocalFile && !isImg) {
      const isSameFile = (localFileList.length > 0 && localFileList[localFileList.length - 1].filePath === filePath);
      if (!isSameFile) {
        localFileList.push({
          filePath,
          click: () => uploadLocalFile({
            ftpHost,
            ftpUser,
            ftpPassword,
            ftpHttpHost,
            ftpFolder,
            originPath,
          })
        })
      }
    }
    // 上传图片
    if (isImg) {
      // 缩略图
      const ratio = clipboardImage.getAspectRatio();
      const img = clipboardImage.resize({
        width: 100,
        height: ratio / 100,
      });
      const isSameImg = (imgList.length > 0 && imgList[imgList.length - 1].img.toDataURL() === img.toDataURL());
      if (!isSameImg) {
        imgList.push({
          img,
          raw: clipboardImage,
          click: () => uploadImg({
            clipboardImage,
            ftpHost,
            ftpUser,
            ftpPassword,
            ftpHttpHost,
            ftpFolder,
            originPath,
          })
        })
      }
    }

    const menus = [{
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
        clipboard.clear();
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
    if (localFileList.length) {
      menus.unshift({
        type: 'separator'
      })
      localFileList.map((item, index) => {
        menus.unshift({
          label: item.filePath,
          type: 'normal',
          click: item.click,
          enabled: isUsingFtp
        })
      });
    }

    if (!isUsingFtp && !uploadDir) {
      menus.unshift({
        label: '暂未设置存储路径',
        type: 'normal',
        enabled: false
      })
    }

    if (isUsingFtp) {
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
  });

  ipcMain.on('onRepoPathChange', (sys, dir) => {
    repoPath = dir
  });
  ipcMain.on('onUploadDirChange', (sys, dir) => {
    uploadDir = dir
  });

  ipcMain.on('onFtpSwitchChange', (sys, isFtp) => {
    isUsingFtp = isFtp
  });
}

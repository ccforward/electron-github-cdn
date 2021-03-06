<template>
  <div class="wrapper">
    <div class="switch-ftp">
      <span>FTP:</span>
      <a-switch v-model="showFtp" @click="onToggleFtp" />
    </div>
    <Ftp v-if="showFtp" />
    <template v-else>
    <div class="wrap-head">
      <div class="wrap-logo">
        <a href="#" @click.prevent="open('https://github.com/')">
          <img class="logo" src="https://img.alicdn.com/tfs/TB1AD6vQ.Y1gK0jSZFMXXaWcVXa-800-665.png" />
        </a>
        <span>x</span>
        <a href="#" @click.prevent="open('https://www.jsdelivr.com/')">
          <img class="logo logo-jsdelivr" src="https://img.alicdn.com/tfs/TB1kQLSQ7L0gK0jSZFAXXcA9pXa-140-34.svg" />
        </a>
      </div>

      <p class="title">GitHub & JSDELIVR</p>
      <p>
        All GitHub files with jsdelivr's cdn url.
      </p>
      <a-button type="primary" icon="github" @click="setRepoPath">选取仓库</a-button>
      <span v-if="repoPath">仓库地址：<b class="repo-path">{{repoPath}}</b></span>
      <div class="wrap-repo" v-if="repoPath">
        <a-button v-if="!customDir" icon="folder-add" @click="setCustomDir">选择文件夹</a-button>
        <p v-if="customDir">文件将存储在:
          <a-tag closable @close="deleteCustomDir">
            {{customDir}}
          </a-tag>
        </p>
      </div>
    </div>
    <div v-if="repoPath" class="upload-box">
      <a-spin :spinning="isUploading" tip="Loading...">
        <a-upload-dragger
          name="file"
          :multiple="true"
          :beforeUpload="() => false"
          @change="onUpload"
        >
          <p class="ant-upload-drag-icon">
            <a-icon type="inbox" />
          </p>
          <p class="upload-text">
            拖拽（多个）图片上传 / <a-button size="small" type="primary">点击上传(可多选)</a-button>
          </p>
          <p class="upload-hint">
            （ 支持类型：JPG，JPEG，PNG，GIF，BMP，WEBP，ICO，SVG ）
          </p>
        </a-upload-dragger>
      </a-spin>
    </div>
    <main class="main-content">
      <div class="operation-bar" v-if="repoPath">
        <a-button type="primary" :icon="loadingFile ? 'loading' : 'reload'" @click="getAllFiles">
          Refresh
        </a-button>
        <span>Only Images</span>
        <a-switch default-checked @click="onTogglePic" />
      </div>
      <div class="gallery">
        <div v-for="item in listFiles" :key="item.path" class="file-item">
          <a-tag class="file-name" color="#333">
            {{ item.name }}
          </a-tag>
          <div class="img-wrap" @click="open(item.cdn)">
            <div class="info-cover">
              <span>{{ item.name }}</span>
              <span>大小：{{ item.size }}</span>
              <span>时间：{{ item.date }}</span>
            </div>
            <img
              v-if="item.isPic"
              slot="extra"
              alt="image"
              :src="item.cdn"
            />
            <a-icon v-else :style="{ fontSize: '30px', color: '#333' }" type="file-protect" />
          </div>
          <a-button icon="copy" type="primary" class="btn-copy" size="small" @click.prevent="copyLink(item.cdn)">
            复制链接
          </a-button>
        </div>
      </div>
    </main>
    </template>
  </div>
</template>

<script>
import Ftp from './Ftp';
import {
  isPathIgnored,
  checkFilesIgnore,
  isGitRepo,
  fileDisplay,
  isPic,
  getCDNUrl,
  upload,
} from '@root/utils';

const fs = require('fs');
const nodePath = require('path');
const electron = require('electron');
const Store = require('electron-store');

const store = new Store();
const { dialog } = electron.remote;
const { clipboard, ipcRenderer } = electron

export default {
  name: 'home-page',
  components: {
    Ftp,
  },
  data () {
    return {
      showFtp: false,
      onlyPic: true,
      repoPath: '',
      customDir: '',
      cdnUrl: '',
      listFiles: [],
      allFiles: [],

      isUploading: false,
      loadingFile: false,
    };
  },
  created () {
    const storedRepo = store.get('repoPath');
    if (storedRepo) {
      this.__initRepoPath(storedRepo);
      this.customDir = this.repoPath ? store.get('customDir') : '';
      ipcRenderer.send('onUploadDirChange', this.customDir);
      ipcRenderer.send('onRepoPathChange', this.repoPath);
    }
    const useFtp = store.get('useFtp') || false;
    this.showFtp = useFtp
    ipcRenderer.send('onFtpSwitchChange', useFtp);
  },
  methods: {
    async onUpload (info) {
      const { path, name, status } = info.file;

      if (!status) {
        this.isUploading = true
        const dirPath = (this.customDir || this.repoPath) + '/';
        let filePath = dirPath + name;
        if (fs.existsSync(filePath)) {
          const extName = nodePath.extname(filePath);
          // TODO path.basename
          filePath = filePath.replace(extName, '') + '_2' + extName;
        }
        fs.copyFileSync(path, filePath);
        const ret = await upload({
          repoPath: this.repoPath,
          filePath,
          fileName: name,
        });
        if (ret) {
          this.$message.success(`${name} upload successfully`);
          this.isUploading = false;
          setTimeout(() => {
            this.getAllFiles();
          }, 100);
        } else {
          filePath && fs.unlinkSync(filePath);
          this.$message.error(`${name} upload failed`);
          this.isUploading = false;
        }
      }
    },
    onToggleFtp (checked) {
      this.showFtp = checked;
      store.set('useFtp', checked);
      ipcRenderer.send('onFtpSwitchChange', checked);
    },
    onTogglePic (checked) {
      this.onlyPic = checked;
      if (this.onlyPic) {
        this.listFiles = this.allFiles.filter(item => item.isPic)
      } else {
        this.listFiles = this.allFiles
      }
    },
    async setRepoPath () {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        message: '选择 GitHub 仓库根目录'
      });
      if (filePaths && filePaths.length === 1) {
        this.__initRepoPath(filePaths[0]);
      }
    },
    __initRepoPath (filePath) {
      if (!isGitRepo(filePath)) {
        return this.$message.error('需要选择一个 GitHub 仓库！');
      }
      const repoPath = filePath;
      const cdnUrl = getCDNUrl(repoPath);
      if (!cdnUrl) this.$message.error('需要选择一个 GitHub 仓库！');
      this.resetData();
      this.repoPath = repoPath;
      store.set('repoPath', repoPath);
      this.cdnUrl = cdnUrl;
      this.getAllFiles();
      ipcRenderer.send('onRepoPathChange', this.repoPath);
    },
    async setCustomDir () {
      const { filePaths } = await dialog.showOpenDialog({
        defaultPath: this.repoPath,
        properties: ['openDirectory', 'createDirectory'],
        message: '选择要存储文件的目录'
      });

      if (filePaths && filePaths.length === 1 && filePaths[0].startsWith(this.repoPath)) {
        const ignoreFile = `${this.repoPath}/.gitignore`;
        if ((filePaths[0] !== this.repoPath) && fs.existsSync(ignoreFile) && isPathIgnored(ignoreFile, filePaths[0].replace(this.repoPath + '/', '') + '/')) {
          this.$message.error(`${filePaths[0]} is ignored!`);
        } else {
          this.customDir = filePaths[0];
          store.set('customDir', this.customDir);
          ipcRenderer.send('onUploadDirChange', this.customDir);
        }
      } else {
        this.$message.error('需要选择当前 GitHub 仓库的子目录！');
      }
    },
    deleteCustomDir () {
      this.customDir = '';
      ipcRenderer.send('onUploadDirChange', this.customDir);
    },
    getAllFiles () {
      if (this.repoPath) {
        this.loadingFile = true;
        const allFiles = fileDisplay(this.repoPath);
        let files = [];
        allFiles.sort((x, y) => y.stats.ctime.getTime() - x.stats.ctime.getTime());
        allFiles.forEach(file => {
          const { path, stats } = file;
          const date = new Date(stats.ctime.getTime());
          files.push({
            name: path.split('/').reverse()[0].trim(),
            path: path.replace(this.repoPath + '/', ''),
            cdn: path.replace(this.repoPath, this.cdnUrl),
            isPic: isPic(path),
            date: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' +
                  date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds(),
            size: (stats.size / 1024).toFixed(0) + ' KB'
          })
        })
        const ignoreFile = `${this.repoPath}/.gitignore`;
        if (fs.existsSync(ignoreFile)) {
          files = checkFilesIgnore(ignoreFile, files)
        }
        this.allFiles = files;
        if (this.onlyPic) {
          this.listFiles = this.allFiles.filter(item => item.isPic)
        } else {
          this.listFiles = this.allFiles
        }
        setTimeout(() => {
          this.loadingFile = false;
        }, 600);
      }
    },
    open (link) {
      this.$electron.shell.openExternal(link);
    },
    copyLink (url) {
      clipboard.writeText(url);
      this.$message.success('链接复制成功');
    },
    resetData () {
      this.onlyPic = true;
      this.repoPath = '';
      this.customDir = '';
      this.cdnUrl = '';
      this.listFiles = [];
      this.allFiles = [];
    }
  },
};
</script>


<style>
.ant-upload.ant-upload-drag {
  padding: 20px 0;
  border: 2px dashed #d9d9d9;
}
</style>
<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css?family=Source+Sans+Pro");

body {
  font-family: "Source Sans Pro", sans-serif;
}

.wrapper {
  padding: 60px 80px;
}

.switch-ftp {
  margin-bottom: 20px;
  text-align: right;
}

.wrap-head {
  text-align: center;
}

.wrap-logo {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  span {
    margin: 0 20px;
    font-size: 50px;
    font-weight: 100;
  }
}
.logo {
  width: 120px;
  height: auto;
}
.logo-jsdelivr {
  width: 145px;
}

.wrap-repo {
  margin: 5px 0;
}
.repo-path {
  padding: 3px;
  background: #40a9ff;
  color: #fff;
}

.upload-box {
  width: 65%;
  margin: 20px auto;
  background: #fff;
  border-width: 2px;
}

.left-side {
  width: 40%;
  max-width: 300px;
}


.upload-hint {
  margin: 20px 0;
  color: #999;
  font-size: 13px;
}
.upload-text {
  font-size: 14px;
  color: #333;
}

.title {
  color: #2c3e50;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 6px;
}

.main-content {
  text-align: center
}
.operation-bar {
  margin: 15px 0;
}

.gallery {
  .file-item {
    position: relative;
    display: inline-block;
    width: 175px;
    height: 186px;
    margin-bottom: 40px;
    margin-right: 10px;
    border: 1px solid #ddd;
    cursor: pointer;
  }
  .file-name {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 10px;
    width: 90%;
    margin: 0 auto;
    overflow: hidden;
    text-align: center;
    text-overflow: ellipsis;
    z-index: 5;
  }
  .file-name-txt {
    display: inline-block;
    padding: 0 8px;
    border-radius: 3px;
    background: #000;
    opacity: 0.7;
    color: #FFF;
    box-shadow: 3px 3px 3px #CCC;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    height: 20px;
    line-height: 20px;
  }
  .img-wrap {
    position: relative;
    width: 172px;
    height: 186px;
    margin-bottom: 5px;
    line-height: 186px;
    text-align: center;
    overflow: hidden;
    background-color: #555;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAChJREFUeNpiPHPmDAMMGBsbw9lMDDgA6RKM%2F%2F%2F%2Fh3POnj1LCzsAAgwAQtYIcFfEyzkAAAAASUVORK5CYII%3D);
    .info-cover {
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 50%;
      padding: 6px;
      flex-direction: column;
      color: #fff;
      line-height: 15px;
      text-align: left;
      font-size: 11.5px;
      background: rgba(0, 0, 0, 0.5);
      span {
        margin-bottom: 5px;
      }
    }
    &:hover .info-cover {
      display: flex;
    }
    img {
      max-height: 161px;
      max-width: 100%;
    }
  }
  .btn-copy {
    height: 22px;
    font-size: 12px;
  }
}

</style>

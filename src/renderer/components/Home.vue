<template>
  <div class="wrapper">
    <div class="wrap-head">
      <img class="logo" src="https://img.alicdn.com/tfs/TB1AD6vQ.Y1gK0jSZFMXXaWcVXa-800-665.png" /> X
      <img class="logo logo-jsdelivr" src="https://img.alicdn.com/tfs/TB1kQLSQ7L0gK0jSZFAXXcA9pXa-140-34.svg" />
      <p class="title">GitHub & JSDELIVR</p>
      <p>
        All GitHub files with jsdelivr's cdn url.
      </p>
      <a-button type="primary" icon="github" @click="setRepoPath">选取仓库</a-button>
      <span v-if="repoPath">仓库地址：<b class="repo-path">{{repoPath}}</b></span>
      <div class="repo-wrap" v-if="repoPath">
        <a-button v-if="!customDir" icon="folder-add" @click="selectDir">选择文件夹</a-button>
        <p v-if="customDir">文件将存储在:
          <a-tag closable @close="customDir = ''">
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
        <div v-for="item in listFiles" :key="item.path" @click="open(item.cdn)" class="file-item">
          <a-tooltip>
            <template slot="title">
              {{ item.path }}
            </template>
            <a-tag class="file-name" color="#333">
              {{ item.name }}
            </a-tag>
          </a-tooltip>
          <div class="img-wrap">
            <img
              v-if="item.isPic"
              slot="extra"
              alt="logo"
              :src="item.cdn"
            />
            <a-icon v-else :style="{ fontSize: '30px', color: '#333' }" type="file-protect" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { isGitRepo, fileDisplay, isPic, getCDNUrl } from '@root/utils';
const fs = require('fs');
const electron = require('electron');
const simpleGit = require('simple-git');
const { dialog } = electron.remote;

export default {
  name: 'home-page',
  data () {
    return {
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
  methods: {
    async onUpload (info) {
      const { path, name, status } = info.file;
      if (!status) {
        this.isUploading = true
        const filePath = this.customDir + '/' + name
        fs.copyFileSync(path, filePath);
        const git = simpleGit({
          baseDir: this.repoPath,
          binary: 'git',
          maxConcurrentProcesses: 6,
        });
        await git.add(filePath);
        await git.commit(`feat: add file ${name}`);
        await git.push();
        this.$message.success(`${name} upload successfully`);
        this.isUploading = false

        setTimeout(() => {
          this.getAllFiles();
        }, 100);
      }
    },
    onTogglePic (checked) {
      this.onlyPic = checked;
      if (this.onlyPic) {
        this.listFiles = this.allFiles.filter(item => item.isPic)
      } else {
        this.listFiles = this.allFiles
      }
    },
    setRepoPath () {
      dialog.showOpenDialog({ properties: ['openDirectory'] }, filePath => {
        if (filePath && filePath.length === 1) {
          if (isGitRepo(filePath[0])) {
            const repoPath = filePath[0];
            const cdnUrl = getCDNUrl(repoPath);
            if (!cdnUrl) this.$message.error('需要选择一个 GitHub 仓库！');
            this.resetData();
            this.repoPath = repoPath;
            this.customDir = repoPath;
            this.cdnUrl = cdnUrl;
            this.getAllFiles();
          } else {
            this.$message.error('需要选择一个 GitHub 仓库！');
          }
        }
      });
    },
    selectDir () {
      dialog.showOpenDialog({ defaultPath: this.repoPath, properties: ['openDirectory', 'createDirectory'] }, filePath => {
        if (filePath && filePath.length === 1 && filePath[0].startsWith(this.repoPath)) {
          this.customDir = filePath[0];
        }
      });
    },
    getAllFiles () {
      if (this.repoPath) {
        this.loadingFile = true;
        const allPaths = fileDisplay(this.repoPath, []);
        const files = [];
        allPaths.forEach(path => {
          files.push({
            name: path.split('/').reverse()[0].trim(),
            path: path.replace(this.repoPath + '/', ''),
            cdn: path.replace(this.repoPath, this.cdnUrl),
            isPic: isPic(path)
          })
        })
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
  border: 2px dashed #d9d9d9;
}
</style>
<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css?family=Source+Sans+Pro");

body {
  font-family: "Source Sans Pro", sans-serif;
}

.wrapper {
  width: 100vw;
  padding: 60px 80px;
}

.wrap-head {
  text-align: center;
}

.repo-wrap {
  margin: 5px 0;
}
.repo-path {
  padding: 3px;
  background: #40a9ff;
  color: #fff;
}

.logo {
  width: 120px;
  height: auto;
  margin-bottom: 20px;
}

.logo-jsdelivr {
  width: 145px;
}

.upload-box {
  width: 50%;
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
    width: 155px;
    height: 186px;
    margin-bottom: 12px;
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
    display: block;
    width: 152px;
    height: 186px;
    line-height: 186px;
    text-align: center;
    overflow: hidden;
    background-color: #555;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAChJREFUeNpiPHPmDAMMGBsbw9lMDDgA6RKM%2F%2F%2F%2Fh3POnj1LCzsAAgwAQtYIcFfEyzkAAAAASUVORK5CYII%3D);
    img {
      max-height: 161px;
      max-width: 172px;
    }
  }
}

</style>

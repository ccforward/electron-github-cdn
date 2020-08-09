<template>
  <div class="wrapper">
    <div class="wrap-head">
      <img class="logo" src="https://img.alicdn.com/tfs/TB1AD6vQ.Y1gK0jSZFMXXaWcVXa-800-665.png" />
      <p class="title">GitHub & CDN</p>
      <p>
        All GitHub files with jsdelivr's cdn url.
      </p>
      <a-button type="primary" icon="github" @click="setRepoPath">选取仓库</a-button>
      <span v-if="repoPath">仓库地址：<b class="repo-path">{{repoPath}}</b></span>
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
        <a-button type="primary" :icon="loadingFile ? 'sync' : 'reload'" @click="getAllFiles">
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
import { isGitRepo, fileDisplay, isPic } from '@root/utils';
const fs = require('fs');
const electron = require('electron');
const parseGit = require('parse-git-config');
const hostedGitInfo = require('hosted-git-info');
const simpleGit = require('simple-git');
const { dialog } = electron.remote;

export default {
  name: 'home-page',
  data () {
    return {
      onlyPic: true,
      repoPath: '',
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
        fs.copyFileSync(path, this.repoPath + '/' + name);
        const git = simpleGit({
          baseDir: this.repoPath,
          binary: 'git',
          maxConcurrentProcesses: 6,
        });
        await git.add(name);
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
            const infox = parseGit.sync({ path: `${repoPath}/.git/config` });
            const head = fs.readFileSync(`${repoPath}/.git/head`)
            const branch = head.toString().split('/').reverse()[0].trim()
            const info = parseGit.expandKeys(infox)
            const githubUrl = info.remote.origin.url;
            if (githubUrl.indexOf('github') < 0) {
              this.$message.error('需要选择一个 GitHub 仓库！');
              return;
            }
            this.resetData();
            const { user, project } = hostedGitInfo.fromUrl(info.remote.origin.url)
            this.repoPath = repoPath;
            this.cdnUrl = `https://cdn.jsdelivr.net/gh/${user}/${project}@${branch}`
            this.getAllFiles();
          } else {
            this.$message.error('需要选择一个 GitHub 仓库！');
          }
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
      this.repoPath = '';
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

.repo-path {
  padding: 3px;
  background: #222;
  color: #fff;
}

.logo {
  width: 120px;
  height: auto;
  margin-bottom: 20px;
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

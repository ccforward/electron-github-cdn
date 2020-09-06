<template>
  <div class="wrapper">
    <h1 class="title">FTP</h1>
    <a-form align="center">
      <a-form-item>
        <a-input v-model="ftpHost" placeholder="host">
          <a-icon slot="prefix" type="cloud-server" style="color: rgba(0,0,0,.25)" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input v-model="ftpUser" placeholder="user" >
          <a-icon slot="prefix" type="user" style="color: rgba(0,0,0,.25)" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input type="password" v-model="ftpPassword" placeholder="password">
          <a-icon slot="prefix" type="lock" style="color: rgba(0,0,0,.25)" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input v-model="httpHost" placeholder="HTTP HOST">
          <a-icon slot="prefix" type="folder" style="color: rgba(0,0,0,.25)" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input v-model="folder" placeholder="存储文件夹">
          <a-icon slot="prefix" type="folder" style="color: rgba(0,0,0,.25)" />
        </a-input>
      </a-form-item>
      <a-form-item :wrapper-col="{ span: 24, offset: 0 }">
        <a-button type="primary" @click="onSave">
          保存
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script>
// import {
//   isPathIgnored,
//   checkFilesIgnore,
//   isGitRepo,
//   fileDisplay,
//   isPic,
//   getCDNUrl,
//   upload,
// } from '@root/utils';
// const fs = require('fs');
// const nodePath = require('path');
const Store = require('electron-store');

const store = new Store();
export default {
  name: 'ftp-setting',
  data () {
    return {
      ftpHost: '',
      ftpUser: '',
      ftpPassword: '',
      httpHost: '',
      folder: '',
    };
  },
  created () {
    const ftpData = store.get('ftpData');
    if (ftpData) {
      const {
        ftpHost,
        ftpUser,
        ftpPassword,
        httpHost,
        folder,
      } = ftpData;
      this.ftpHost = ftpHost
      this.ftpUser = ftpUser
      this.ftpPassword = ftpPassword
      this.httpHost = httpHost
      this.folder = folder
    }
  },
  methods: {
    async onUpload () {

    },
    onSave () {
      store.set('ftpData', {
        ftpHost: this.ftpHost,
        ftpUser: this.ftpUser,
        ftpPassword: this.ftpPassword,
        folder: this.folder,
      });
    }
  },
};
</script>

<style lang="scss" scoped>
  .title {
    text-align: center
  }
</style>

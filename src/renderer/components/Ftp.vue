<template>
  <div class="wrapper">
    <h1 class="title">FTP For GodD丶小翊</h1>
    <a-form align="center">
      <a-form-item>
        <a-input v-model="ftpHost" placeholder="host">
          <a-icon class="form-icon" slot="prefix" type="cloud-server" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input v-model="ftpUser" placeholder="user" >
          <a-icon class="form-icon" slot="prefix" type="user" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input type="password" v-model="ftpPassword" placeholder="password">
          <a-icon class="form-icon" slot="prefix" type="lock" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input v-model="httpHost" placeholder="HTTP HOST">
          <a-icon class="form-icon" slot="prefix" type="global" />
        </a-input>
      </a-form-item>
      <a-form-item>
        <a-input v-model="folder" placeholder="存储文件夹">
          <a-icon class="form-icon" slot="prefix" type="folder" />
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
    onSave () {
      store.set('ftpData', {
        ftpHost: this.ftpHost,
        ftpUser: this.ftpUser,
        ftpPassword: this.ftpPassword,
        httpHost: this.httpHost,
        folder: this.folder,
      });
      this.$message.success('FTP setting save successfully');
    }
  },
};
</script>

<style lang="scss" scoped>
  .form-icon {
    color: rgba(0,0,0,.25)
  }
  .title {
    text-align: center
  }
</style>

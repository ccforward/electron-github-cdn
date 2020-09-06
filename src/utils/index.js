import {
  Notification,
} from 'electron';

const fs = require('fs');
const path = require('path');
const parseGit = require('parse-git-config');
const hostedGitInfo = require('hosted-git-info');
const ignore = require('ignore');
const simpleGit = require('simple-git');
const ftp = require("basic-ftp")

export function checkFilesIgnore (ignoreFile, files) {
  const ig = ignore().add(fs.readFileSync(ignoreFile).toString())
  return files.filter(file => {
    return !ig.ignores(file.path)
  })
}

export function isPathIgnored (ignoreFile, path) {
  const ig = ignore().add(fs.readFileSync(ignoreFile).toString())
  return ig.ignores(path)
}

export function isGitRepo (filePath) {
  return fs.existsSync(path.join(filePath, '.git'))
}

export function fileDisplay (filePath) {
  const files = fs.readdirSync(filePath);
  return files.reduce(function (filesArr, fileName) {
    var filedir = path.join(filePath, fileName);
    // 根据文件路径获取文件信息，返回一个fs.Stats对象
    const stats = fs.statSync(filedir);
    var isFile = stats.isFile();
    var isDir = stats.isDirectory();
    if (isFile) {
      filesArr.push({
        path: filedir,
        stats
      })
    }
    if (isDir && !/node_modules|\.git/.test(filedir)) {
      filesArr.push(...fileDisplay(filedir));
    }
    return filesArr;
  }, []);
}

export function isPic (filePath) {
  const types = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']
  return types.includes(path.extname(filePath));
}

export function getCDNUrl (repoPath) {
  const infox = parseGit.sync({ path: `${repoPath}/.git/config` });
  const head = fs.readFileSync(`${repoPath}/.git/head`)
  const branch = head.toString().split('/').reverse()[0].trim()
  const info = parseGit.expandKeys(infox)
  const githubUrl = info.remote.origin.url;
  if (githubUrl.indexOf('github') < 0) {
    return false;
  }
  const {
    user,
    project
  } = hostedGitInfo.fromUrl(githubUrl)
  return `https://cdn.jsdelivr.net/gh/${user}/${project}@${branch}`;
}

export async function ftpUpload ({
  filePath,
  fileName,
  host,
  user,
  password,
  folder
}) {
  if (!filePath || !fileName || !host || !user || !password) {
    return false;
  }
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host,
      user,
      password,
      secure: false
    })
    // 确认文件夹名
    folder && await client.ensureDir(folder)
    // 删除所有内容
    // await client.clearWorkingDir()
    // 上传文件
    await client.uploadFrom(filePath, fileName)
    return true;
  } catch (e) {
    return false;
  }
}

export async function upload ({
  repoPath,
  filePath,
  fileName,
}) {
  if (!repoPath || !filePath || !fileName) {
    return false;
  }
  try {
    const git = simpleGit({
      baseDir: repoPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
    });
    await git.add(filePath);
    await git.commit(`feat: add file ${fileName}`);
    await git.push();
    return true;
  } catch (e) {
    return false;
  }
}

export function triggerNotify ({
  title,
  body
}) {
  const notify = new Notification({
    title,
    body
  });
  notify.show();
}

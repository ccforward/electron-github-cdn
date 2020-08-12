const fs = require('fs');
const path = require('path');
const parseGit = require('parse-git-config');
const hostedGitInfo = require('hosted-git-info');
const ignore = require('ignore');

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
  // 遍历读取到的文件列表
  return files.reduce(function (filesArr, filename) {
    // 获取当前文件的绝对路径
    var filedir = path.join(filePath, filename);
    // 根据文件路径获取文件信息，返回一个fs.Stats对象
    const stats = fs.statSync(filedir);
    var isFile = stats.isFile(); // 是文件
    var isDir = stats.isDirectory(); // 是文件夹
    if (isFile) {
      filesArr.push(filedir)
    }
    if (isDir && !/node_modules|\.git/.test(filedir)) {
      filesArr.push(...fileDisplay(filedir)); // 递归，如果是文件夹，就继续遍历该文件夹下面的文件
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

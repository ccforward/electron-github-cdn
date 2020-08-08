const fs = require('fs');
const path = require('path');

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

const os = require('os');

// 获取IP地址（优先返回内网IPv4地址）
function getIpAddress() {
  const interfaces = os.networkInterfaces();
  
  // 内网IP范围正则表达式
  const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
  
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const address of addresses) {
      // 只返回IPv4地址，且不是回环地址，且是内网地址
      if (address.family === 'IPv4' && !address.internal && privateIpRegex.test(address.address)) {
        return address.address;
      }
    }
  }
  
  // 如果没有找到内网IPv4地址，返回127.0.0.1
  return '127.0.0.1';
}

module.exports = {
  getIpAddress
};
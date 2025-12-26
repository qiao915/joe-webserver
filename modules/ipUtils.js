const os = require('os');

// 获取IP地址（优先返回内网IPv4地址）
function getIpAddress() {
  const interfaces = os.networkInterfaces();
  
  // 内网IP范围正则表达式
  const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
  
  // 优先选择的接口名称列表（按优先级排序）
  const preferredInterfaces = ['以太网', 'Ethernet', '本地连接', 'Local Area Connection', 'Wi-Fi', 'WLAN', '无线局域网'];
  
  // 先查找优先接口
  for (const preferredName of preferredInterfaces) {
    if (interfaces[preferredName]) {
      for (const address of interfaces[preferredName]) {
        if (address.family === 'IPv4' && !address.internal && privateIpRegex.test(address.address)) {
          return address.address;
        }
      }
    }
  }
  
  // 如果没有找到优先接口，再查找其他接口
  for (const interfaceName in interfaces) {
    // 跳过虚拟网卡接口（通常包含VMware、VirtualBox、Hyper-V、vEthernet等关键词）
    if (/VMware|VirtualBox|Hyper-V|vEthernet|Virtual|VM/.test(interfaceName)) {
      continue;
    }
    
    const addresses = interfaces[interfaceName];
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal && privateIpRegex.test(address.address)) {
        return address.address;
      }
    }
  }
  
  // 如果还是没有找到，返回第一个可用的内网IPv4地址（包括虚拟网卡）
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const address of addresses) {
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
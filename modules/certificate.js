const crypto = require('crypto');

// 生成自签名证书函数
function generateSelfSignedCertificate() {
  try {
    // 使用crypto生成真正的自签名证书
    const forge = require('node-forge');
    
    // 创建RSA密钥对
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // 创建证书
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    // 设置证书属性
    const attrs = [
      { name: 'commonName', value: 'localhost' },
      { name: 'countryName', value: 'CN' },
      { shortName: 'ST', value: 'Beijing' },
      { name: 'localityName', value: 'Beijing' },
      { name: 'organizationName', value: 'Joe Web Server' },
      { shortName: 'OU', value: 'Development' }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs); // 自签名证书
    
    // 添加扩展
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '0.0.0.0' }
        ]
      }
    ]);
    
    // 自签名证书
    cert.sign(keys.privateKey);
    
    // 转换为PEM格式
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const publicKeyPem = forge.pki.certificateToPem(cert);
    
    return { 
      key: privateKeyPem, 
      cert: publicKeyPem 
    };
  } catch (err) {
    console.error(`\u001b[31mCertificate generation error / 证书生成错误: ${err.message}\u001b[0m`);
    // 尝试使用简化的证书生成方法
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      
      // 使用node-forge简化版生成证书
      const forge = require('node-forge');
      const cert = forge.pki.createCertificate();
      cert.publicKey = forge.pki.publicKeyFromPem(publicKey);
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
      
      const attrs = [
        { name: 'commonName', value: 'localhost' }
      ];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.sign(forge.pki.privateKeyFromPem(privateKey));
      
      return { 
        key: privateKey, 
        cert: forge.pki.certificateToPem(cert) 
      };
    } catch (fallbackErr) {
      console.error(`\u001b[31mFallback certificate generation failed / 备用证书生成也失败: ${fallbackErr.message}\u001b[0m`);
      return null;
    }
  }
}

module.exports = {
  generateSelfSignedCertificate
};
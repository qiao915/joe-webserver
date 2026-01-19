const path = require('path');
const fs = require('fs');
const readline = require('readline');

// 自定义inquirer模拟
const inquirer = {
  prompt: async (questions) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answers = {};
    
    for (const question of questions) {
      await new Promise((resolve) => {
        if (question.type === 'confirm') {
          rl.question(`${question.message} `, (answer) => {
            answers[question.name] = answer.toLowerCase() === 'y' || answer === '';
            resolve();
          });
        } else if (question.type === 'input') {
          rl.question(`${question.message} `, (answer) => {
            if (question.validate) {
              const validationResult = question.validate(answer);
              if (validationResult !== true) {
                console.log(`\u001b[31m${validationResult}\u001b[0m`);
                rl.close();
                process.exit(1);
              }
            }
            answers[question.name] = answer;
            resolve();
          });
        }
      });
    }
    
    rl.close();
    return answers;
  }
};

// 处理目录选择
async function handleDirectorySelection(options, initialStaticDir) {
  let staticDir = initialStaticDir;
  
  if (options.dir) {
    staticDir = options.dir;
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useDefaultDir',
        message: 'Use default directory (current directory)? [Y/n]: ',
        default: true
      }
    ]);

    if (answer.useDefaultDir) {
      staticDir = process.cwd();
    } else {
      const dirAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'dirPath',
          message: 'Please enter the directory path to serve: ',
          validate: (input) => {
            if (!input) {
              return 'Error: Please enter a valid directory path / 错误: 请输入有效的目录路径';
            }
            const trimmedInput = input.trim();
            const resolvedPath = path.resolve(trimmedInput);
            if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isDirectory()) {
              return true;
            }
            return 'Error: Invalid directory path / 错误: 无效的目录路径';
          }
        }
      ]);
      staticDir = dirAnswer.dirPath.trim();
    }
  }
  
  // 确保路径解析正确
  return path.resolve(staticDir.trim());
}

module.exports = {
  handleDirectorySelection
};
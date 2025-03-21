import {ipcMain} from "electron"
// import Client from 'ftp'
import {Client} from 'basic-ftp'
import fs from 'fs'
import path from 'path'

// 默认值，当配置未提供时使用
const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 5200

// 存储从配置文件读取的服务器设置
let ftpHost = DEFAULT_HOST
let ftpPort = DEFAULT_PORT

// 更新FTP配置的函数
function updateFtpConfig(config) {
  if (config && config.UPLOAD) {
    ftpHost = config.UPLOAD.UPLOAD_Add || DEFAULT_HOST
    ftpPort = parseInt(config.UPLOAD.UPLOAD_Port || DEFAULT_PORT)
    console.log(`已更新FTP服务器配置: ${ftpHost}:${ftpPort}`)
  }
}

ipcMain.on('updateFtpConfig', (event, config) => {
  updateFtpConfig(config)
})

const onUpload = (appPath) => {
  // 跟踪活跃的上传进程
  const activeUploads = new Map()
  // 用于跟踪上传是否正在被取消的标志
  let cancelingUploads = false

  // 取消上传的处理程序
  ipcMain.on('cancelUploads', (event) => {
    console.log('收到取消上传请求')
    cancelingUploads = true
    
    // 短暂延迟后清除跟踪变量，以允许进行中的操作完成
    setTimeout(() => {
      cancelingUploads = false
      activeUploads.clear()
      console.log('所有上传任务已取消')
    }, 1000)
  })

  ipcMain.on('uploadFile', async (event, args) => {
    console.log(args)
    const {deviceId, password, compressedFilePath, fileName, filePath, taskFile} = args
    
    console.log('接收到上传请求:', { compressedFilePath, fileName, filePath, deviceId, taskFile })
    console.log(`使用FTP服务器: ${ftpHost}:${ftpPort}`)
    
    // 如果正在取消上传，则跳过
    if (cancelingUploads) {
      console.log(`跳过上传文件 ${fileName}，因为用户已取消上传`)
      return
    }
    
    // 如果文件已经在上传中，则跳过
    if (activeUploads.has(filePath)) {
      event.reply('error', `文件 ${fileName} 正在上传中，请稍后再试`)
      return
    }
    
    if (!fs.existsSync(compressedFilePath)) {
      event.reply('error', `要上传的文件 ${fileName} 不存在`)
      return
    }
    
    console.log(`开始上传文件: ${fileName}, 设备ID: ${deviceId}, 路径: ${filePath}, 压缩路径: ${compressedFilePath}`)
    
    // 跟踪此上传
    activeUploads.set(filePath, true)

    const client = new Client()
    client.ftp.verbose = true
    try {
      await client.access({
        host: ftpHost,
        port: ftpPort,
        user: deviceId,
        password,
        secure: true,
        secureOptions: {
          key: fs.readFileSync(path.join(appPath, './certs/server/server.key')),
          cert: fs.readFileSync(path.join(appPath, './certs/server/server.crt')),
          ca: fs.readFileSync(path.join(appPath, './certs/ca/ca.crt')),
          rejectUnauthorized: false,
          strictSSL:false,
        }
      })
      
      // 检查是否在上传过程中被取消
      if (cancelingUploads) {
        console.log(`上传已取消: ${fileName}`)
        client.close()
        activeUploads.delete(filePath)
        return
      }
      
      await client.uploadFrom(compressedFilePath, `/${fileName}`)
      
      // 如果提供了任务文件路径，则更新任务文件中的状态
      if (taskFile) {
        // 发送更新文件状态的请求
        event.sender.send('updateFileStatus', {
          taskFile,
          filePath,
          newStatus: 'completed' // 更新为已完成状态
        })
      }
      
      event.reply('uploadFinished', args)
    }
    catch(err) {
      console.error('上传失败:', err)
      event.reply('error', `上传失败: ${err.message}`)
    }
    finally {
      client.close()
      activeUploads.delete(filePath)
    }
  })
}

export default onUpload

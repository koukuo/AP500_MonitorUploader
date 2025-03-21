import {dialog, ipcMain} from "electron"
import path from 'path'
import fs from 'fs'
import {exec} from 'child_process'

const onCompress = (appPath) => {
  // 跟踪活跃的压缩进程
  const activeCompressions = new Map()
  
  // 用于跟踪压缩是否正在被取消的标志
  let cancelingUploads = false

  // 取消压缩的处理程序
  ipcMain.on('cancelUploads', (event) => {
    console.log('收到取消压缩请求')
    cancelingUploads = true
    
    // 短暂延迟后清除跟踪变量，以允许进行中的操作完成
    setTimeout(() => {
      cancelingUploads = false
      activeCompressions.clear()
      console.log('所有压缩任务已取消')
    }, 1000)
  })

  ipcMain.on('compressFile', (event, row) => {
    const {filePath} = row

    // 如果正在取消，则跳过
    if (cancelingUploads) {
      console.log(`跳过压缩文件 ${path.basename(filePath)}，因为用户已取消上传`)
      return
    }

    // 如果文件已经在压缩中，则跳过
    if (activeCompressions.has(filePath)) {
      event.reply('error', `文件 ${path.basename(filePath)} 正在压缩中，请稍后再试`)
      return
    }

    const compressedFilePath = `${filePath}.7z`
    const _7zPath = path.join(appPath, './7z/win/x64/7za.exe')

    if (fs.existsSync(_7zPath) && fs.existsSync(filePath)) {
      try {
        // 检查压缩文件是否已存在
        if (fs.existsSync(compressedFilePath)) {
          console.log('压缩文件已存在，直接使用')
          row.compressedFilePath = compressedFilePath
          const compressFileStat = fs.statSync(compressedFilePath)
          row.fileSize = compressFileStat.size
          row.fileName = path.basename(compressedFilePath)
          event.reply('compressFinished', row)
          return
        }

        // 跟踪此压缩进程
        activeCompressions.set(filePath, true)
        
        const childProcess = exec(`${_7zPath} a ${compressedFilePath} ${filePath}`, (error, stdout, stderr) => {
          // 从活跃压缩中移除
          activeCompressions.delete(filePath)
          
          // 如果正在取消，则跳过后续处理
          if (cancelingUploads) {
            console.log(`压缩完成，但跳过上传 ${path.basename(filePath)}，因为用户已取消上传`)
            return
          }
          
          if (error) {
            console.error('压缩错误:', error)
            event.reply('error', `压缩失败: ${error.message}`)
          } else {
            console.log('压缩完成')
            row.compressedFilePath = compressedFilePath
            const compressFileStat = fs.statSync(compressedFilePath)
            row.fileSize = compressFileStat.size
            row.fileName = path.basename(compressedFilePath)
            event.reply('compressFinished', row)
          }
        });
      } catch (err) {
        activeCompressions.delete(filePath)
        console.error('压缩过程发生异常:', err)
        event.reply('error', `压缩过程发生异常: ${err.message}`)
      }
    } else {
      if (!fs.existsSync(_7zPath)) {
        event.reply('error', '未找到7z压缩工具')
      } else if (!fs.existsSync(filePath)) {
        event.reply('error', `文件 ${path.basename(filePath)} 不存在`)
      }
    }
  })
}

export default onCompress

import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import ini from '@/plugins/ini'

const uuidRegex = /^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/

//主进程 监听openDialog方法

const readTasks = (dir, taskType) => {

  const fileList = []
  const taskTypeDir = path.join(dir, taskType)

  const files = fs.readdirSync(taskTypeDir)
  files.forEach((file) => {
    if (uuidRegex.test(file)) {
      let filePath = path.join(dir, file)
      if (fs.existsSync(filePath)) {
        const fileState = fs.statSync(filePath)
        if (fileState.isDirectory()) {
          fileList.push({
            taskUUID: file,
            filePath: filePath,
            taskFile: path.join(taskTypeDir, file),
            fileName: file,
            createTime: parseInt(fileState.birthtimeMs),
            savedTime: parseInt(fileState.mtimeMs),
            fileSize: fileState.size,
            isDir: true,

          })
        }
      }
    }
  })
  return fileList
}

const onLoadFiles = () => {
  ipcMain.on('loadFiles', (event, { taskFile, taskDir }) => {
    try {
      const taskDetailString = fs.readFileSync(taskFile, 'utf-8')
      const taskDetailObj = JSON.parse(taskDetailString)
      const filesList = []
      
      if (taskDetailObj.files) {
        taskDetailObj.files.forEach((fileInfo) => {
          const {createTime, fileName, fileSize, fileType, savedTime, uploadStatus} = fileInfo
          const filePath = path.join(taskDir, fileType, fileName)
          
          // 添加文件信息，不管文件是否存在
          const fileExists = fs.existsSync(filePath)
          
          filesList.push({
            taskUUID: path.basename(taskFile),
            filePath,
            fileName,
            fileType,
            createTime,
            savedTime,
            fileSize,
            uploadStatus, // 直接包含任务文件中的状态
            fileExists   // 添加文件是否存在的标记
          })
        })
      }
      
      event.returnValue = filesList
    } catch (error) {
      console.error('读取任务文件出错:', error)
      event.returnValue = []
    }
  })
}

const onOpenDialog = (win) => {

  ipcMain.on('openDialog', (event) => {
    const selectedFiles = dialog.showOpenDialogSync(win, {
      title: '选择监测端配置文件',
      filters: [{ name: 'config', extensions: ['ini'] }],
      properties: ['openFile'],
    })
    if (selectedFiles) {
      event.reply('configFile', selectedFiles[0])

    }
    // readDirFileList(filePaths[0])
    // event.sender.send('selectedDir', filePaths)

  })
}

const onLoadTasks = () => {
  ipcMain.on('loadTasks', (event, recordDir) => {
    const executing = readTasks(recordDir, 'executing')
    const executed = readTasks(recordDir, 'executed')
    event.reply('tasks', {
      executing,
      executed,
    })
  })

}

const onMonitorConfig = () => {
  ipcMain.on('loadMonitorConfig', (event, configPath) => {

    event.reply('log', configPath)
    const config = ini.parse(fs.readFileSync(configPath, 'utf-8'))
    console.log(config)
    const recordDir = config.General.recordRoot
    const deviceId = config.General.deviceId
    
    event.sender.send('updateFtpConfig', config)
    
    event.reply('monitorConfig', {
      deviceId,
      recordDir,
      ftpServer: config.UPLOAD ? {
        host: config.UPLOAD.UPLOAD_Add,
        port: config.UPLOAD.UPLOAD_Port
      } : null,
      webServer: config.Web ? config.Web.index : null
    })
  })
}

// 新增：更新任务文件中的文件状态
const onUpdateFileStatus = () => {
  ipcMain.on('updateFileStatus', (event, { taskFile, filePath, newStatus }) => {
    try {
      if (!fs.existsSync(taskFile)) {
        console.error(`任务文件不存在: ${taskFile}`)
        event.reply('error', `任务文件 ${taskFile} 不存在`)
        return
      }
      
      // 读取任务文件
      const taskDetailString = fs.readFileSync(taskFile, 'utf-8')
      const taskDetailObj = JSON.parse(taskDetailString)
      
      console.log('任务文件内容:', JSON.stringify(taskDetailObj, null, 2))
      console.log('要更新的文件路径:', filePath)
      console.log('新状态:', newStatus)
      
      if (!taskDetailObj.files || !Array.isArray(taskDetailObj.files)) {
        console.error(`任务文件格式不正确: ${taskFile}`)
        event.reply('error', `任务文件 ${taskFile} 格式不正确`)
        return
      }
      
      // 查找并更新文件状态 - 更宽松的匹配逻辑
      let updated = false
      const baseFilename = path.basename(filePath).replace(/\.7z$/, '')
      console.log('基础文件名:', baseFilename)
      
      taskDetailObj.files.forEach(file => {
        console.log('检查文件:', file.fileName)
        // 尝试多种匹配方式
        const fileNameNoExt = path.parse(file.fileName).name
        
        if (
          file.fileName === path.basename(filePath) || 
          fileNameNoExt === baseFilename ||
          file.fileName.includes(baseFilename) ||
          baseFilename.includes(fileNameNoExt)
        ) {
          console.log(`找到匹配文件! 旧状态: ${file.uploadStatus}, 设置为: ${newStatus}`)
          file.uploadStatus = newStatus
          updated = true
        }
      })
      
      if (updated) {
        console.log('更新任务文件:', taskFile)
        // 写回任务文件
        fs.writeFileSync(taskFile, JSON.stringify(taskDetailObj, null, 2))
        event.reply('fileStatusUpdated', { success: true, taskFile, filePath })
      } else {
        console.error(`未找到匹配文件: ${filePath}`)
        event.reply('error', `在任务文件 ${taskFile} 中未找到文件 ${filePath}`)
      }
    } catch (error) {
      console.error('更新文件状态出错:', error)
      event.reply('error', `更新文件状态出错: ${error.message}`)
    }
  })
}
export {
  onOpenDialog,
  onMonitorConfig,
  onLoadTasks,
  onLoadFiles,
  onUpdateFileStatus,
}

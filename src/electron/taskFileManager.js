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
    const fileInfos = []

    const taskDetailString = fs.readFileSync(taskFile, 'utf-8')
    const taskDetailObj = JSON.parse(taskDetailString)
    const existDataFiles = []
    if (taskDetailObj.files){
      taskDetailObj.files.forEach((fileInfo) => {
        const {createTime, fileName, fileSize, fileType, savedTime, uploadStatus} = fileInfo
        if (uploadStatus === 'unUploaded') {
          const filePath = path.join(taskDir, fileType,fileName)
          if (fs.existsSync(filePath)){
            existDataFiles.push({
              taskUUID: path.basename(taskFile),
              filePath,
              fileName,
              fileType,
              createTime,
              savedTime,
              fileSize,
            })
          }
        }
      })

    }


    event.returnValue = existDataFiles
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
    event.reply('monitorConfig', {
      deviceId,
      recordDir,
    })
  })
}

export {
  onOpenDialog,
  onMonitorConfig,
  onLoadTasks,
  onLoadFiles,
}

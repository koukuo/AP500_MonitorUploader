import {dialog, ipcMain} from "electron"
import path from 'path'
import fs from 'fs'
import {exec} from 'child_process'



const onCompress = (appPath)=>{

  ipcMain.on('compressFile', (event, row)=>{
    const {filePath} = row

    const compressedFilePath = `${filePath}.7z`
    const _7zPath = path.join(appPath, './7z/win/x64/7za.exe')

    if (fs.existsSync(_7zPath) && fs.existsSync(filePath)) {
    const childProcess = exec(`${_7zPath} a ${compressedFilePath} ${filePath}`, (error, stdout, stderr)=>{
      if (error){
        dialog.showErrorBox('Error', error.message)
      }else {
        console.log('压缩完成')
        row.compressedFilePath = compressedFilePath
        const compressFileStat = fs.statSync(compressedFilePath)
        row.fileSize = compressFileStat.size
        row.fileName = path.basename(compressedFilePath)
        event.reply('compressFinished', row)
      }
    });
    }
  })
}

export default onCompress

import {ipcMain} from "electron"
// import Client from 'ftp'
import {Client} from 'basic-ftp'
import fs from 'fs'
import path from 'path'

const host = '127.0.0.1'
const port = 5200

const onUpload = (appPath)=>{


  ipcMain.on('uploadFile', async (event, args) => {
    console.log(args)
    const {deviceId, password, compressedFilePath, fileName} = args

    const client = new Client()
    client.ftp.verbose = true
    try {
      await client.access({
        host,
        port,
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
      await client.uploadFrom(compressedFilePath, `/${fileName}`)
      event.reply('uploadFinished', args)
    }
    catch(err) {
      console.log(err)
    }
    client.close()

  })
}

export default onUpload

<template>
  <el-container>
    <el-header style="text-align: right">
      <el-button @click="showConfigDialog">配置</el-button>
    </el-header>
    <el-main>
      <div style="font-size: 20px; text-align: left;margin-bottom: 10px">执行中</div>
      <el-table
          :data="executingTable"
          :load="load"
          lazy
          fit
          row-key="filePath"
          :tree-props="{children: 'files', hasChildren: 'isDir'}"
          style="width: 100%">
        <el-table-column
            type="selection"
            width="55">
        </el-table-column>

        <el-table-column
            label="文件名"
            prop="fileName"
        >
        </el-table-column>
        <el-table-column
            label="文件创建时间"
        >
          <template slot-scope="scope">
            {{ scope.row.createTime | dateTime }}
          </template>
        </el-table-column>
        <el-table-column
            label="文件大小"
            prop="fileSize"
        >
        </el-table-column>
        <el-table-column
            label="状态"
        >
        </el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
                size="mini"
                v-if="!scope.row.isDir"
                @click="compressFile(scope.$index, scope.row)">上传
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="font-size: 20px; text-align: left; margin-top: 20px; margin-bottom: 10px">已完成</div>
      <el-table
          :data="executedTable"
          :load="load"
          lazy
          fit
          row-key="filePath"
          :tree-props="{children: 'files', hasChildren: 'isDir'}"
          style="width: 100%">
        <el-table-column
            type="selection"
            width="55">
        </el-table-column>

        <el-table-column
            label="文件名"
            prop="fileName"
        >
        </el-table-column>
        <el-table-column
            label="文件创建时间"
        >
          <template slot-scope="scope">
            {{ scope.row.createTime | dateTime }}
          </template>
        </el-table-column>
        <el-table-column
            label="文件大小"
            prop="fileSize"
        >
        </el-table-column>
        <el-table-column
            label="状态"
        >
        </el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
                size="mini"
                v-if="!scope.row.isDir"
                @click="compressFile(scope.$index, scope.row)">上传
            </el-button>
          </template>
        </el-table-column>
      </el-table>

    </el-main>
    <el-dialog
        title="配置"
        :visible.sync="dialogVisible"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
        width="60%"
    >
      <el-input placeholder="选择检测段配置文件" v-model="configFilePath" disabled
                class="input-with-select">
        <el-button slot="append" icon="el-icon-more" @click="selectConfig"></el-button>
      </el-input>
      <span slot="footer" class="dialog-footer">
    <el-button @click="clearConfig">取 消</el-button>
    <el-button type="primary" @click="setConfig">确 定</el-button>
  </span>
    </el-dialog>
  </el-container>
</template>

<script>

import { ipcMain, ipcRenderer } from 'electron'

export default {
  name: 'landing-page',
  methods: {
    handleEdit (index, row) {
      console.log(index, row)
    },
    handleDelete (index, row) {
      console.log(index, row)
    },
    selectConfig () {
      ipcRenderer.send('openDialog')
    },

    load (row, treeNode, resolve) {
      const fileList = ipcRenderer.sendSync('loadFiles', {
        taskFile: row.taskFile,
        taskDir: row.filePath,
      })
      fileList.forEach((file) => {
        file.taskUUID = row.taskUUID
      })
      resolve(fileList)
    },

    showConfigDialog () {
      this.dialogConfigPath = this.configFilePath
      this.dialogUserName = this.username
      this.dialogPassword = this.password

      this.dialogVisible = true
    },

    loadMonitorConfig () {
      ipcRenderer.send('loadMonitorConfig', this.configFilePath)
    },

    setConfig () {

      this.configFilePath = this.dialogConfigPath
      this.username = this.dialogUserName
      this.password = this.dialogPassword
      this.dialogVisible = false
      localStorage.setItem('config', JSON.stringify({
        configPath: this.configFilePath,
        username: this.username,
        password: this.password,
      }))
      this.loadMonitorConfig()
      // this.login()
    },

    clearConfig () {

      this.dialogConfigPath = ''
      this.dialogUserName = ''
      this.dialogPassword = ''
      this.dialogVisible = false

    },

    loadSavedConfig () {
      const configString = localStorage.getItem('config')
      if (configString) {
        const { configPath, username, password } = JSON.parse(configString)
        this.configFilePath = configPath
        this.username = username
        this.password = password
      }
      if (this.configFilePath) {
        this.loadMonitorConfig()
      }
      if (this.username && this.password) {
        // this.login()
      }
    },

    login () {
      this.$http.post('https://101.36.255.206/api/login', { username: this.username, password: this.password }).
          then((res) => {
            console.log(res)
          })
    },

    compressFile (index, row) {
      row.index = index
      ipcRenderer.send('compressFile', row)
    },

    uploadFile (row) {
      const { taskUUID, fileSize, fileName, fileType, createTime, savedTime, filePath } = row
      this.$http.post('https://101.36.255.206/api/ftp_request', {
        deviceId: this.deviceId,
        taskUUID,
        fileSize,
        fileName,
        fileType,
        createTime,
        savedTime,
      }).then((res) => {
        console.log(res.data)
        console.log(res.data && res.data.res && ['SUCCESS', 'success'].indexOf(res.data.res) >= 0)
        if (res.data && res.data.res && ['SUCCESS', 'success'].indexOf(res.data.res) >= 0) {
          const { password } = res.data.data
          ipcRenderer.send('uploadFile', {
            ...row,
            password,
            deviceId: this.deviceId,
          })
        }
      })

    },

  },
  data () {
    return {
      executingTable: [],
      executedTable: [],
      dialogVisible: false,
      dialogUserName: '',
      dialogPassword: '',
      dialogConfigPath: '',
      configFilePath: '',
      username: '',
      password: '',
      deviceId: '',
      recordDir: '',
    }
  },

  filters: {
    dateTime (val) {
      return new Date(val).toLocaleString()
    },
  },

  mounted () {

    this.loadSavedConfig()

    ipcRenderer.on('tasks', (res, { executing, executed }) => {
      this.executingTable = executing
      this.executedTable = executed
    })

    ipcRenderer.on('monitorConfig', (res, { deviceId, recordDir }) => {
      this.deviceId = deviceId
      this.recordDir = recordDir
      console.log(recordDir)
      ipcRenderer.send('loadTasks', recordDir)
    })

    ipcRenderer.on('log', (res, log) => {
      console.log(log)
    })

    ipcRenderer.on('fileInfos', (res, fileInfos) => {
      console.log(fileInfos)
    })

    ipcRenderer.on('configFile', (res, filePath) => {
      console.log(filePath)
      this.dialogConfigPath = filePath

    })

    ipcRenderer.on('compressFinished', (event, args) => {
      this.uploadFile(args)
    })
    ipcRenderer.on('error', (event, error) => {
      console.log(error)
      alert(error)
    })

    ipcRenderer.on('uploadFinished', (event, args) => {
      const { fileName } = args
      this.$message({
        message: `${args.fileName.substring(0, fileName.length - 3)}上传完成`,
        type: 'success',
      })
    })
  },
}
</script>

<style>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Source Sans Pro', sans-serif;
}

#wrapper {
  background: radial-gradient(
      ellipse at top left,
      rgba(255, 255, 255, 1) 40%,
      rgba(229, 229, 229, .9) 100%
  );
  height: 100vh;
  padding: 60px 80px;
  width: 100vw;
}

#logo {
  height: auto;
  margin-bottom: 20px;
  width: 420px;
}

main {
  display: flex;
  justify-content: space-between;
}

main > div {
  flex-basis: 50%;
}

.left-side {
  display: flex;
  flex-direction: column;
}

.welcome {
  color: #555;
  font-size: 23px;
  margin-bottom: 10px;
}

.title {
  color: #2c3e50;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 6px;
}

.title.alt {
  font-size: 18px;
  margin-bottom: 10px;
}

.doc p {
  color: black;
  margin-bottom: 10px;
}

.doc button {
  font-size: .8em;
  cursor: pointer;
  outline: none;
  padding: 0.75em 2em;
  border-radius: 2em;
  display: inline-block;
  color: #fff;
  background-color: #4fc08d;
  transition: all 0.15s ease;
  box-sizing: border-box;
  border: 1px solid #4fc08d;
}

.doc button.alt {
  color: #42b983;
  background-color: transparent;
}
</style>

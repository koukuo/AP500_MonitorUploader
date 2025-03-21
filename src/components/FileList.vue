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
      <div style="margin-bottom: 10px; display: flex; align-items: center;">
        <el-select v-model="uploadMode" style="width: 150px; margin-right: 10px;">
          <el-option label="依次上传" value="sequential"></el-option>
          <el-option label="并行上传" value="parallel"></el-option>
        </el-select>
        <el-button type="primary" @click="batchUpload('executed')" :loading="isUploading" :disabled="isUploading">批量上传</el-button>
        <el-button type="danger" v-if="isUploading" @click="cancelBatchUpload" style="margin-left: 10px;">取消上传</el-button>
        <span v-if="isUploading" style="margin-left: 10px;">
          正在上传 {{ activeUploads }}/{{ totalUploads }} 个文件
        </span>
      </div>
      <el-table
          :data="executedTable"
          :load="load"
          lazy
          fit
          row-key="filePath"
          :tree-props="{children: 'files', hasChildren: 'isDir'}"
          style="width: 100%"
          @selection-change="handleExecutedSelectionChange">
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
          <template slot-scope="scope">
            <span v-if="uploadStatus[scope.row.filePath] || scope.row.uploadStatus">
              <el-tag v-if="(uploadStatus[scope.row.filePath] || scope.row.uploadStatus) === 'queued'" type="info">排队中</el-tag>
              <el-tag v-else-if="(uploadStatus[scope.row.filePath] || scope.row.uploadStatus) === 'compressing'" type="warning">压缩中</el-tag>
              <el-tag v-else-if="(uploadStatus[scope.row.filePath] || scope.row.uploadStatus) === 'uploading'" type="primary">上传中</el-tag>
              <el-tag v-else-if="(uploadStatus[scope.row.filePath] || scope.row.uploadStatus) === 'completed'" type="success">已完成</el-tag>
              <el-tag v-else-if="(uploadStatus[scope.row.filePath] || scope.row.uploadStatus) === 'failed'" type="danger">失败</el-tag>
            </span>
            <span v-else-if="scope.row.fileExists === false">
              <el-tag type="danger">文件不存在</el-tag>
            </span>
          </template>
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
        file.taskFile = row.taskFile
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
      this.$http.post('https://127.0.0.1/api/login', { username: this.username, password: this.password }).
          then((res) => {
            console.log(res)
          })
    },

    compressFile (index, row) {
      console.log('发送压缩请求:', JSON.stringify(row, null, 2))
      row.index = index
      ipcRenderer.send('compressFile', row)
    },

    uploadFile (row) {
      console.log('准备上传文件:', row)
      this.$set(this.uploadStatus, row.filePath, 'uploading')
      
      const { taskUUID, fileSize, fileName, fileType, createTime, savedTime, filePath } = row
      this.$http.post('https://127.0.0.1/api/ftp_request', {
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
            taskFile: row.taskFile
          })
        } else {
          this.$set(this.uploadStatus, row.filePath, 'failed')
          this.handleUploadComplete()
        }
      }).catch((error) => {
        console.error('上传请求失败:', error)
        this.$set(this.uploadStatus, row.filePath, 'failed')
        this.handleUploadComplete()
      })
    
    },

    batchUpload (table) {
      if (this.isUploading) {
        this.$message.warning('已有上传任务正在进行中，请等待完成')
        return
      }

      // 只处理已完成表的批量上传
      const selectedFiles = this.selectedExecutedFiles
      
      if (selectedFiles.length === 0) {
        this.$message.warning('请选择要上传的文件')
        return
      }

      this.isUploading = true
      this.uploadQueue = [...selectedFiles]
      this.totalUploads = selectedFiles.length
      this.activeUploads = 0
      
      // 初始化上传状态
      this.uploadStatus = {}
      selectedFiles.forEach(file => {
        this.$set(this.uploadStatus, file.filePath, 'queued') 
      })
      
      // 添加一个刷新定时器，定期刷新界面状态
      this.startStatusRefreshTimer()
      
      if (this.uploadMode === 'sequential') {
        this.processNextInQueue()
      } else {
        // 并行上传，同时启动多个上传任务
        const startCount = Math.min(this.maxParallelUploads, this.uploadQueue.length)
        for (let i = 0; i < startCount; i++) {
          this.processNextInQueue()
        }
      }
    },

    processNextInQueue() {
      if (this.uploadQueue.length === 0) {
        if (this.activeUploads === 0) {
          this.isUploading = false
          this.$message.success('操作完成')
        }
        return
      }

      const file = this.uploadQueue.shift()
      this.activeUploads++
      this.$set(this.uploadStatus, file.filePath, 'compressing')
      
      // 使用现有的压缩上传逻辑处理单个文件
      this.compressFile(0, file)
    },

    handleExecutedSelectionChange (selectedRows) {
      this.selectedExecutedFiles = selectedRows.filter(row => !row.isDir)
    },

    handleUploadComplete() {
      this.activeUploads--
      
      // 如果是顺序上传或者并行上传但仍有空闲槽位，继续处理队列
      if (this.uploadMode === 'sequential' || this.activeUploads < this.maxParallelUploads) {
        this.processNextInQueue()
      }
    },

    cancelBatchUpload() {
      this.$confirm('确定要取消当前上传任务吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 清空上传队列
        this.uploadQueue = []
        
        // 发送取消信号到后端
        ipcRenderer.send('cancelUploads')
        
        // 更新状态
        Object.keys(this.uploadStatus).forEach(filePath => {
          if (['queued', 'compressing', 'uploading'].includes(this.uploadStatus[filePath])) {
            this.$set(this.uploadStatus, filePath, 'failed')
          }
        })
        
        this.isUploading = false
        this.activeUploads = 0
        
        // 强制组件重新渲染
        this.$forceUpdate()
        
        this.$message({
          type: 'info',
          message: '上传任务已取消'
        })
      }).catch(() => {
        // 用户取消操作，不做任何处理
      })
    },

    // 添加定时刷新方法
    startStatusRefreshTimer() {
      // 清除已有的定时器
      if (this.statusRefreshTimer) {
        clearInterval(this.statusRefreshTimer)
      }
      
      // 每秒刷新一次界面状态
      this.statusRefreshTimer = setInterval(() => {
        if (this.isUploading) {
          // 强制更新视图
          this.$forceUpdate()
          
          // 更新表格数据源以确保状态显示
          this.syncStatusToTables()
        } else {
          // 如果上传结束，停止定时器
          clearInterval(this.statusRefreshTimer)
        }
      }, 1000)
    },
    
    // 添加同步状态到表格数据的方法
    syncStatusToTables() {
      // 深度复制当前表格数据
      const executingCopy = JSON.parse(JSON.stringify(this.executingTable))
      const executedCopy = JSON.parse(JSON.stringify(this.executedTable))
      
      // 更新执行中表格的状态
      this.updateTableStatus(executingCopy)
      // 更新已完成表格的状态
      this.updateTableStatus(executedCopy)
      
      // 替换表格数据引用以触发重新渲染
      this.executingTable = executingCopy
      this.executedTable = executedCopy
    },
    
    // 更新表格数据状态的递归方法
    updateTableStatus(items) {
      if (!items || !Array.isArray(items)) return
      
      items.forEach(item => {
        if (item.filePath && this.uploadStatus[item.filePath]) {
          // 直接添加状态到表格数据
          item.uploadStatus = this.uploadStatus[item.filePath]
        }
        
        // 递归处理子节点
        if (item.files && Array.isArray(item.files)) {
          this.updateTableStatus(item.files)
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
      uploadMode: 'sequential',
      selectedExecutedFiles: [],
      isUploading: false,
      uploadQueue: [],
      maxParallelUploads: 3,
      activeUploads: 0,
      totalUploads: 0,
      uploadStatus: {}, // 追踪每个文件的状态
      statusRefreshTimer: null
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

    ipcRenderer.on('updateFileStatus', (event, args) => {
      console.log('收到更新文件状态请求:', args)
      ipcRenderer.send('updateFileStatus', args)
    })

    ipcRenderer.on('fileStatusUpdated', (event, args) => {
      console.log('文件状态已更新:', args)
      if (args.success) {
        // 刷新表格数据，重新加载任务
        if (this.recordDir) {
          // 重新加载任务
          ipcRenderer.send('loadTasks', this.recordDir)
          
          // 如果状态是completed，在UI中也更新显示
          if (args.filePath) {
            this.$set(this.uploadStatus, args.filePath, 'completed')
            this.syncStatusToTables()
            this.$forceUpdate()
          }
        }
      }
    })

    ipcRenderer.on('compressFinished', (event, args) => {
      this.uploadFile(args)
    })
    ipcRenderer.on('error', (event, error) => {
      console.log(error)
      alert(error)
      
      // 如果是在批量上传中，标记为失败并继续下一个
      if (this.isUploading) {
        // 尝试从错误信息中提取文件路径
        const filePath = Object.keys(this.uploadStatus).find(path => error.includes(path))
        if (filePath) {
          // 使用Vue.$set确保响应式更新
          this.$set(this.uploadStatus, filePath, 'failed')
        }
        this.handleUploadComplete()
      }
    })

    ipcRenderer.on('uploadFinished', (event, args) => {
      const { fileName, filePath, compressedFilePath } = args
      console.log('上传完成事件接收:', { fileName, filePath, compressedFilePath, args })
      
      // 直接更新显示成功消息
      this.$message({
        message: `${fileName.replace(/\.7z$/, '')}上传完成`,
        type: 'success',
      })
      
      // 尝试使用filePath和compressedFilePath找到文件的状态记录
      let statusFound = false
       
      // 方法1: 直接使用filePath
      if (filePath && this.uploadStatus[filePath]) {
        console.log(`更新状态(通过filePath): ${filePath} => completed`)
        // 使用Vue.$set确保响应式更新
        this.$set(this.uploadStatus, filePath, 'completed')
        statusFound = true
      } 
      // 方法2: 使用压缩文件路径
      else if (compressedFilePath && this.uploadStatus[compressedFilePath]) {
        console.log(`更新状态(通过compressedFilePath): ${compressedFilePath} => completed`)
        this.$set(this.uploadStatus, compressedFilePath, 'completed')
        statusFound = true
      }
      
      // 更新表格数据以确保状态显示
      this.syncStatusToTables()
      
      // 使用nextTick确保DOM已更新后再强制渲染
      this.$nextTick(() => {
        // 强制组件重新渲染
        this.$forceUpdate();
        
        // 完成处理，继续下一个上传
        this.handleUploadComplete()
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


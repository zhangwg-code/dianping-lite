/**
 * Local development server
 * Starts an Express server to handle API requests during development
 */
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import app from './index.js'

dotenv.config()

const PORT = process.env.PORT || 3001

const server = express()
server.use(cors())
server.use(app)

server.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})

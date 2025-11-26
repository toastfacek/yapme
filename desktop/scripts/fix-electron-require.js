#!/usr/bin/env node
/**
 * Fix TypeScript's compilation of Electron require() statements
 *
 * TypeScript compiles `import { app } from 'electron'` to `const electron_1 = require("electron")`
 * However, when run with node (not electron), require("electron") returns a string path, not the API.
 * This script fixes the compiled output to use direct destructuring from require("electron").
 */

const fs = require('fs')
const path = require('path')

const mainJsPath = path.join(__dirname, '../dist/electron/main.js')

if (!fs.existsSync(mainJsPath)) {
  console.error('Error: dist/electron/main.js not found')
  process.exit(1)
}

let content = fs.readFileSync(mainJsPath, 'utf8')

// Replace: const electron_1 = require("electron");
// With: const { app, BrowserWindow, ipcMain } = require("electron");
content = content.replace(
  /const electron_1 = require\("electron"\);/,
  'const { app, BrowserWindow, ipcMain } = require("electron");'
)

// Replace all electron_1.* references with direct references
content = content.replace(/electron_1\.app/g, 'app')
content = content.replace(/electron_1\.BrowserWindow/g, 'BrowserWindow')
content = content.replace(/electron_1\.ipcMain/g, 'ipcMain')

fs.writeFileSync(mainJsPath, content)

console.log('✅ Fixed Electron require() statements in dist/electron/main.js')

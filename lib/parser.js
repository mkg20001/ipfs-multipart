'use strict'

const Dicer = require('dicer')
const Content = require('content')
const stream = require('stream')
const util = require('util')
const Transform = stream.Transform

const parseDisposition = (disposition) => {
  const details = {}
  details.type = disposition.split(';')[0]
  if (details.type === 'file') {
    const fileNamePattern = /filename=\"(.+)\"/
    details.fileName = disposition.match(fileNamePattern)[1]
  }

  return details
}

const parseHeader = (header) => {
  const type = Content.type(header['content-type'][0])
  const disposition = parseDisposition(header['content-disposition'][0])

  const details = type
  details.fileName = disposition.fileName
  details.type = disposition.type

  return details
}

function Parser (options) {
  // allow use without new
  if (!(this instanceof Parser)) {
    return new Parser(options)
  }

  this.dicer = new Dicer({ boundary: options.boundary })

  this.dicer.on('part', (part) => {
    part.on('header', (header) => {
      const partHeader = parseHeader(header)
      this.emit('file', partHeader.fileName, part)
    })
  })

  this.dicer.on('error', (err) => {
    this.emit('err', err)
  })

  this.dicer.on('finish', () => {
    this.emit('finish')
    this.emit('end')
  })

  Transform.call(this, options)
}
util.inherits(Parser, Transform)

Parser.prototype._transform = function (chunk, enc, cb) {
  this.dicer.write(chunk, enc)
  cb()
}

module.exports = Parser
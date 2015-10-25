import { dest } from 'vinyl-fs'
import thr from 'through2'
import File from 'vinyl'
import combine from 'stream-combiner2'
import postcss from 'postcss'
import url from 'postcss-custom-url'
import pick from 'util-mix/pick'

export default function (outFolder, outOpts, urlOpts) {
  let files = []
  let emptyFiles = []
  let urlProcessor = createProcessor(urlOpts || {})
  return combine.obj(
    thr.obj(function (file, _, next) {
      files.push(file)
      let f = copyWithoutContents(file)
      emptyFiles.push(f)
      next(null, f)
    }),
    dest(outFolder, outOpts),
    thr.obj(function (file, _, next) {
      let i = emptyFiles.indexOf(file)
      if (i === -1) {
        return next(null, file)
      }
      let writePath = file.path
      file = files[i]
      urlProcessor.process(
        file.contents.toString('utf8'),
        { from: file.path, to: writePath }
      )
      .then(function (result) {
        file.contents = Buffer(result.css)
        next(null, file)
      })
    }),
    dest(outFolder, outOpts)
  )
}

function createProcessor(opts) {
  if (typeof opts.process === 'function') {
    return opts
  }
  return postcss(url([
    [ url.util.inline, pick('maxSize', opts) ],
    [ url.util.copy, pick(['useHash', 'assetOutFolder'], opts) ],
  ]))
}

function copyWithoutContents(file) {
  return new File({
    cwd: file.cwd,
    base: file.base,
    path: file.path,
    contents: null,
  })
}

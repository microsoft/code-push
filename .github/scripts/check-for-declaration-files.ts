import fs from "fs";
import path from "path";

type ResultType = {
    js : Record<string , boolean>
    ts : Record<string , boolean>
}

const result: ResultType = {js:{} , ts:{}}

const readThroughDirectory = (directory: string): void => {
  const __directoryPath = path.join(process.env.INIT_CWD ?? '', directory);
  const files = fs.readdirSync(__directoryPath);
  files.forEach((file) => {
    const filePath = path.join(__directoryPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      readThroughDirectory(filePath);
    }

    if(filePath.endsWith('.js')){
        const name = filePath.split('.')
        name.pop()
        result.js[name.join('.')] = true
    }

    if(filePath.endsWith('.d.ts')){
        const name = filePath.split('.')
        name.pop()
        name.pop()
        result.ts[name.join('.')] = true
    }

  });

  Object.keys(result.js).forEach(file => {
    if(!result.ts[file]){
        throw new Error(`Declaration File Missing for ${file}.js`)
    }
  })
  
};

readThroughDirectory('./bin')

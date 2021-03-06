import fg from 'fast-glob';
import fse from 'fs-extra';
import path from 'path';
import { convertJS } from './convertJS';

export async function convert(glob: string) {
  const files = await fg(glob, {
    absolute: true,
    onlyFiles: true,
    unique: true,
  });

  for await (const file of files) {
    if (['.js', '.ts'].includes(path.extname(file))) {
      try {
        const { result, changed } = await convertJS(
          await fse.readFile(file, 'utf-8')
        );
        if (changed) fse.writeFile(file, result.code);
      } catch (error) {
        console.log('---转换失败---');
        console.log(`${file} \n`, error);
      }
    }
  }
}

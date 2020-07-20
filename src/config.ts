import fse from 'fs-extra';
import path from 'path';

export interface IConvertConfig {
  [key: string]: IConvertConfigValue;
}

export interface IConvertConfigValue {
  replacedKey: string;
  isDefault?: boolean;
  import: string;
}

let convertConfig: IConvertConfig = {};
let containsPromise: Promise<boolean>;

export async function readConfigAsync(): Promise<IConvertConfig> {
  const configPath = path.join(process.cwd(), 'jgb.convert.js');
  if (!containsPromise) {
    containsPromise = fse.pathExists(configPath);
  }
  const contains = await containsPromise;
  if (contains) {
    return require(configPath);
  }
  return convertConfig;
}

export function setConfig(config: IConvertConfig) {
  convertConfig = config;
}

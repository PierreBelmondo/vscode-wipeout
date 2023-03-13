import { BufferRange } from "@core/utils/range";

export class WacFolder {
  range = new BufferRange();

  name: string;
  files: WacFile[] = [];
  folders: WacFolder[] = [];

  static load(range: BufferRange): WacFolder {
    const ret = new WacFolder();

    ret.range = range.slice(0, 20);

    const filesCount = ret.range.getUint32(0);
    const foldersCount = ret.range.getUint32(4);
    const nameOffset = ret.range.getUint32(8);
    const filesTableOffset = ret.range.getUint32(12);
    const foldersTableOffset = ret.range.getUint32(16);

    const absoluteRange = ret.range.reset();
    ret.name = absoluteRange.getCString(nameOffset);

    const rangeFilesOffsets = absoluteRange.slice(filesTableOffset, filesTableOffset + filesCount * 4);
    for (let i = 0; i < filesCount; i++) {
      const offset = rangeFilesOffsets.getUint32(i * 4);
      const fileRange = absoluteRange.slice(offset);
      const file = WacFile.load(fileRange);
      ret.files.push(file);
    }

    const rangeFoldersOffsets = absoluteRange.slice(foldersTableOffset, foldersTableOffset + foldersCount * 4);
    for (let i = 0; i < foldersCount; i++) {
      const offset = rangeFoldersOffsets.getUint32(i * 4);
      const folderRange = absoluteRange.slice(offset);
      const folder = WacFolder.load(folderRange);
      ret.folders.push(folder);
    }

    return ret;
  }

  all(currentPath: string = "") {
    let files: { path: string; file: WacFile }[] = [];
    for (const folder of this.folders) {
      let path = currentPath + folder.name.replace('\\', '/');
      const moreFiles = folder.all(path);
      files = files.concat(moreFiles);
    }
    for (const file of this.files) {
      let path = currentPath + file.name
      files.push({ path, file });
    }
    return files;
  }
}

export class WacFile {
  range = new BufferRange();

  name: string;
  size: number;
  unknown: number;
  offset: number;

  static load(range: BufferRange) {
    const ret = new WacFile();

    ret.range = range.slice(0, 20);

    const nameOffset = ret.range.getUint32(0);
    ret.size = ret.range.getUint32(4);
    ret.unknown = ret.range.getUint32(8);
    ret.offset = ret.range.getUint32(12);

    const absoluteRange = ret.range.reset();
    ret.name = absoluteRange.getCString(nameOffset);

    return ret;
  }
}

export class Wac {
  range = new BufferRange();

  folder: WacFolder;

  static load(buffer: ArrayBuffer): Wac {
    const ret = new Wac();
    ret.range = new BufferRange(buffer);
    ret.folder = WacFolder.load(ret.range);
    return ret;
  }

  get all() {
    return this.folder.all();
  }
}

import { BufferRange } from "../range";

// inspired by https://github.com/vgmstream/vgmstream/blob/master/src/meta/bnk_sony.c

export class BnkFile {
  range = new BufferRange();

  static load(range: BufferRange): BnkFile {
    const ret = new BnkFile();
    return ret;
  }
}

export class BnkHeader {
  range = new BufferRange();

  version = 3;
  parts = 2;
  sblk_offset = 0;
  sblk_size = 0;
  data_offset = 0;
  data_size = 0;

  static load(range: BufferRange): BnkHeader {
    const ret = new BnkHeader();
    range = ret.range = range.slice(0, 24);
    ret.version = range.getUint32(0);
    ret.parts = range.getUint32(4);
    ret.sblk_offset = range.getUint32(8);
    ret.sblk_size = range.getUint32(12);
    ret.data_offset = range.getUint32(16);
    ret.data_size = range.getUint32(20);
    return ret;
  }

  get slbkRange():BufferRange {
    return this.range.reset(this.sblk_offset, this.sblk_offset + this.sblk_size)
  }

  get dataRange(): BufferRange {
    return this.range.reset(this.data_offset, this.data_offset + this.data_size)
  }
}

export class BnkSectionBlock {
  range = new BufferRange();

  magic = "SBlk";
  version = 0;
  section_entries = 0;
  material_entries = 0;
  stream_entries = 0;
  table1_offset = 0;
  table2_offset = 0;
  table3_offset = 0;
  table4_offset = 0;
  table1_entry_size = 0;
  table1_suboffset = 0;
  table2_suboffset = 0;

  total_subsongs = 0;

  static load(range: BufferRange): BnkSectionBlock {
    const ret = new BnkSectionBlock();
    ret.range = range.clone();
    ret.magic = ret.range.slice(0, 4).getString();
    ret.version = ret.range.getUint32(4);

    switch (ret.version) {
      case 0x01: // Ratchet & Clank (PS2)
        ret.section_entries = ret.range.getUint16(0x16);
        ret.material_entries = ret.range.getUint16(0x18);
        ret.stream_entries = ret.range.getUint16(0x1a);
        ret.table1_offset = ret.range.getUint16(0x1c);
        ret.table2_offset = ret.range.getUint16(0x20);
        ret.table3_offset = ret.table2_offset;
        ret.table4_offset = 0;
        ret.table1_entry_size = 0; /* not used */
        ret.table1_suboffset = 0;
        ret.table2_suboffset = 0;
        break;
      case 0x03: // Yu-Gi-Oh! GX - The Beginning of Destiny (PS2)
      case 0x04: // Test banks
      case 0x05: // Ratchet & Clank (PS3)
      case 0x08: // Playstation Home Arcade (Vita)
      case 0x09: // Puyo Puyo Tetris (PS4)
        ret.section_entries = ret.range.getUint16(0x16);
        ret.material_entries = ret.range.getUint16(0x18);
        ret.stream_entries = ret.range.getUint16(0x1a);
        ret.table1_offset = ret.range.getUint16(0x1c);
        ret.table2_offset = ret.range.getUint16(0x20);
        /* 0x24: VAG address? */
        /* 0x28: data size */
        /* 0x2c: RAM size */
        /* 0x30: next block offset */
        ret.table3_offset = ret.range.getUint32(0x34);
        ret.table4_offset = ret.range.getUint32(0x38);
        ret.table1_entry_size = 0x0c;
        ret.table1_suboffset = 0x08;
        ret.table2_suboffset = 0x00;
        break;
      case 0x0d: // Polara (Vita), Crypt of the Necrodancer (Vita)
      case 0x0e: // Yakuza 6's Puyo Puyo (PS4)
        ret.table1_offset = ret.range.getUint32(0x18);
        ret.table2_offset = ret.range.getUint32(0x1c);
        ret.table3_offset = ret.range.getUint32(0x2c);
        ret.table4_offset = ret.range.getUint32(0x30);
        ret.section_entries = ret.range.getUint16(0x38);
        ret.material_entries = ret.range.getUint16(0x3a);
        ret.stream_entries = ret.range.getUint16(0x3c);
        ret.table1_entry_size = 0x24;
        ret.table1_suboffset = 0x0c;
        ret.table2_suboffset = 0x00;
        break;
    }

    const table1Range = ret.table1;
    for (let i = 0; i < ret.section_entries; i++) {
      const entry_offset = table1Range.getUint16(i * ret.table1_entry_size + ret.table1_suboffset);
      console.log(entry_offset);
    }

    return ret;
  }

  get table1(): BufferRange {
    return this.range.reset();
  }

  get table2(): BufferRange {
    return this.range.reset();
  }

  get table3(): BufferRange {
    return this.range.reset();
  }

  get table4(): BufferRange {
    return this.range.reset();
  }
}

export class BnkTable1 {

}

export class Bnk {
  range = new BufferRange();
  header = new BnkHeader();
  sectionBlock = new BnkSectionBlock();
  table1 = new BnkTable1();

  static load(buffer: ArrayBuffer): Bnk {
    const ret = new Bnk();
    ret.range = new BufferRange(buffer);
    ret.header = BnkHeader.load(ret.range);

    const sblkRange = ret.header.slbkRange;
    ret.sectionBlock = BnkSectionBlock.load(sblkRange);

    const dataRange = ret.header.dataRange;
  
    //ret.table1 = BnkTable1.load()
    console.log(ret);
    return ret;
  }
}

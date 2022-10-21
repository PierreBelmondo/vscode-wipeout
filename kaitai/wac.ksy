meta:
  id: wac
  file-extension: wac
  endian: le

seq:
  - id: folder
    type: folder

types:
  folder:
    seq:
      - id: files_count
        type: u4
      - id: folders_count
        type: u4
      - id: name_offset
        type: u4
      - id: files_table_offset
        type: u4
      - id: folders_table_offset
        type: u4
        
    instances:
      name:
        type: str
        encoding: ascii
        terminator: 0
        pos: name_offset
      files:
        type: file_offset
        pos: files_table_offset
        repeat: expr
        repeat-expr: files_count
      folders:
        type: folder_offset
        pos: folders_table_offset
        repeat: expr
        repeat-expr: folders_count

  file:
    seq:
      - id: name_offset
        type: u4
      - id: size
        type: u4
      - id: dummy
        type: u4
      - id: offset
        type: u4
    instances:
      name:
        type: str
        encoding: ascii
        terminator: 0
        pos: name_offset
        
  folder_offset:
    seq:
      - id: offset
        type: u4
    instances:
      file:
        type: folder
        pos: offset
        
  file_offset:
    seq:
      - id: offset
        type: u4
    instances:
      file:
        type: file
        pos: offset
        

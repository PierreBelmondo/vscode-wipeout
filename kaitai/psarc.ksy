meta:
  id: psarc
  file-extension: psarc
  endian: be

seq:
  - id: magic
    contents: PSAR
  - id: version_major
    type: u2
  - id: version_minor
    type: u2
  - id: compression
    type: str
    size: 4
    encoding: ASCII
  - id: size
    type: u4
  - id: entry_size
    type: u4
  - id: num_files
    type: u4
  - id: block_size
    type: u4
  - id: flags
    type: u4
  - id: files
    type: entry_header_1e
    repeat: expr
    repeat-expr: num_files

instances:
  data:
    pos: 0x5C00000
    size: 0x180
      
types:
  entry_header_1e:
    seq:
      - id: md5
        type: u1
        repeat: expr
        repeat-expr: 16
      - id: index
        type: u4
      - id: l4
        type: u4
      - id: l1
        type: u1
      - id: o4
        type: u4
      - id: o1
        type: u1
    instances:
      length:
        value: (l4 << 8 + l1)
      offset:
        value: (o4 << 8 + o1)        
        
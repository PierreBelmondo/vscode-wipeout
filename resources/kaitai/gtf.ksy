meta:
  id: gtf
  file-extension: gtf
  endian: be
  
seq:
  - id: header
    type: header
    size: 128
  - id: data
    type: data
    size: header.actual_data_size
  - id: maybe_padding
    size: header.data_size - header.actual_data_size
    
enums:
  cell_gcm_texture:
    0x81: b8
    0x82: a1r5g5b5
    0x83: a4r4g4b4
    0x84: r5g6b5
    0x85: a8r8g8b8
    0x86: compressed_dxt1
    0x87: compressed_dxt23
    0x88: compressed_dxt45
    0x8b: g8b8
    0x8d: compressed_b8r8_g8r8
    0x8e: compressed_r8b8_r8g8
    0x8f: r6g5b5
    0x90: depth24_d8
    0x91: depth24_d8_float
    0x92: depth16
    0x93: depth16_float
    0x94: x16
    0x95: y16_x16
    0x97: r5g5b5a1
    0x98: compressed_hilo8
    0x99: compressed_hilo_s8
    0x9a: w16_z16_y16_x16_float
    0x9b: w32_z32_y32_x32_float
    0x9c: x32_float
    0x9d: d1r5g5b5
    0x9e: d8r8g8b8
    0x9f: y16_x16_float

types:
  header:
    seq:
      - id: version
        type: u4
      - id: data_size
        type: u4
      - id: unknown2
        type: u4
      - id: unknown3
        type: u4
      - id: unknown4
        type: u4
      - id: actual_data_size
        type: u4
      - id: flags
        type: u4
      - id: remap
        type: u4
      - id: width
        type: u2
      - id: height
        type: u2
      - id: unknown9
        type: u4
      - id: unknown10
        type: u4
      - id: unknown11
        type: u4
      - id: reserved
        size: 0x50
    instances:
      z_texture_format:
        value: (flags & 0x9f000000) >> 24
        enum: cell_gcm_texture
      z_compressed_dxt:
        value: z_texture_format == cell_gcm_texture::compressed_dxt1 or z_texture_format == cell_gcm_texture::compressed_dxt23 or z_texture_format == cell_gcm_texture::compressed_dxt45
      z_normalized:
        value: (flags & 0x40000000) == 0
      z_swizzled:
        value: (flags & 0x20000000) == 0
        if: z_compressed_dxt == false
      z_power_of_two:
        value: (flags & 0x20000000) == 0
        if: z_compressed_dxt == true
      z_mipmaps:
        value: (flags & 0x00FF0000) >> 16
      z_cube:
        value: (flags & 0x000000FF) != 0
        
  data:
    seq:
      - id: unknown0
        size: 1024
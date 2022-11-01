meta:
  id: rcsmodel
  file-extension: rcsmodel
  endian: be

seq:
  - id: header
    type: header
  - id: unknown_mesh_info
    type: mesh16
    repeat: expr
    repeat-expr: header.mesh_table_count
  - id: materials
    type: material_offset
    repeat: expr
    repeat-expr: header.material_table_count
  - id: padding
    size: 16 - (_io.pos % 16)
    
instances:
  meshes:
    type: mesh_table(header.mesh_table_count)
    pos: header.mesh_table_offset
    
types:
  header:
    seq:
      - id: magic
        type: u2
      - id: rcs_id
        type: u2
      - id: header_length
        type: u4
      - id: ones
        type: u4
      - id: zeroes
        type: u4
      - id: unknown4
        type: u4
      - id: unknown5
        type: u4
      - id: unknown6
        type: u4
      - id: mesh_table_count
        type: u4
      - id: mesh_table_offset
        type: u4
      - id: header_size
        type: u4
      - id: texture_table_offset
        type: u4
      - id: material_table_count
        type: u4
      - id: material_table_offset
        type: u4
      - id: padding
        size: 12
        
  mesh16:
    seq:
      - id: f1
        type: f4
      - id: f2
        type: f4
      - id: f3
        type: f4
      - id: f4
        type: f4
  
  material_offset:
    seq:
      - id: offset
        type: u4
    instances:
      material_info:
        type: material_info_header
        pos: offset

  material_info_header:
    seq:
      - id: unknown0
        type: u4
      - id: offset_filename
        type: u4
      - id: unknown2
        type: u4
      - id: zeros
        type: u4
      - id: unknown4
        type: u4
      - id: unknown5_1
        type: u2
      - id: unknown5_2
        type: u2
      - id : offset_end_maybe
        type: u4
      - id: unknown7
        type: u4
      - id: unknown8
        type: u4
      - id: unknown9
        type: u4
      - id: unknown10
        type: u4
      - id: unknown11
        type: u4
      - id: count_mat1
        type: u4
      - id: offset_mat1
        type: u4
      - id: offset_end_mat1
        type: u4
      - id: unknown15
        type: u4
    instances:
      filename:
        type: str
        terminator: 0
        pos: offset_filename
        encoding: ascii
      mat1:
        type: mat1
        pos: offset_mat1
        repeat: expr
        repeat-expr: count_mat1

  mat1:
    seq:
      - id: unknown0
        type: u4
      - id: type
        type: u4
      - id: unknown2
        type: u4
      - id: unknown3
        type: u4
      - id: unknown4
        type: u4
      - id: unknown5
        type: u4
      - id: offset_filename
        type: u4
      - id: unknown7
        type: u4
    instances:
      filename:
        if: type == 0x8001
        type: str
        terminator: 0
        pos: offset_filename
        encoding: ascii

  mat1_extended:
    seq:
      - id: what
        type: u4
        
  mesh_table:
    params:
      - id: count
        type: u4
    seq:
      - id: mesh
        type: mesh_offset
        repeat: expr
        repeat-expr: count

  mesh_offset:
    seq:
      - id: offset
        type: u4
    instances:
      header:
        type: mesh_header
        pos: offset

  mesh_header:
    seq:
      - id: unknown0
        type: u4
      - id: maybe_material_id
        type: u2
      - id: maybe_type
        type: u2
      - id: unknown3
        type: u4
      - id: unknown4
        type: u4 
      - id: unknown5
        type: u4 
      - id: unknown6
        type: u4 
      - id: offset_end
        type: u4
      - id: unknown7
        type: u4
      - id: material_id
        type: u4
      - id: unknown8
        type: u4
      - id: ffffffff
        type: u4
      - id: zeros
        type: u4
      - id: position
        type: fxyzw
      - id: scale
        type: fxyzw
      - id: mesh102
        type: mesh102
        if: maybe_type == 0x102 
      - id: mesh502
        type: mesh502
        if: maybe_type == 0x502
  
  mesh102:
    seq:
      - id: vbo_count
        type: u4
      - id: vbo_offset
        type: u4
      - id: ibo_count
        type: u4
      - id: ibo_offset
        type: u4
      - id: unknown
        size: 12
      - id: maybe_offset
        type: u2
        
    instances:
      vbo_end:
        value: vbo_offset + 16
      vbo:
        pos: vbo_offset
        size: 16
      ibo:
        pos: ibo_offset
        size: ibo_count*2
        
  mesh502:
    seq:
      - id: count_submesh
        type: u4
      - id: offset_maybe
        type: u4
      - id: offset_vb
        type: u4
      - id: offset_before_end
        type: u4
      - id: submeshes
        type: submesh_header
        size: 8 * 16
        repeat: expr
        repeat-expr: count_submesh
    instances:
      vertex_buffer:
        pos: offset_vb
        type: vertex_buffer
        size: 9*16
      vertex_extra:
        pos: offset_before_end
        type: vertex_extra
        
  submesh_header:
    seq:
      - id: unknown24a
        type: u2
      - id: unknown24b
        type: u2
      - id: unknown25a
        type: u2
      - id: unknown25b
        type: u2
      - id: vbo_count
        type: u2
      - id: ibo_count
        type: u2
      - id: unknown27
        type: u4
      - id: offset_index
        type: u4
      - id: unknown29
        type: u4
      - id: offset_data
        type: u4
    instances:
      vertex_data:
        pos: 0
        type: u4
      vertex_index:
        pos: offset_index
        type: u4

  vertex_buffer:
    seq:
      - id: count
        type: u1
      - id: type
        type: u1
      - id: zeros
        type: u2
      - id: test
        type: vb_what
        repeat: expr
        repeat-expr: count

  vb_what:
    seq:
      - id: unknown0
        type: u2
      - id: unknown1
        type: u2
      - id: maybe_type
        type: u2
      - id: unknown3
        type: u2
        
        
  vertex_index:
    seq:
      - id: vertex_id
        type: u2
        repeat: eos

  vertex_data:
    params:
      - id: type
        type: u1
    seq:
      - id: data
        type:
          switch-on: type
          cases:
            #12: stride_12
            #18: stride_18
            22: stride_22
        #repeat: eos
        repeat: expr
        repeat-expr: 10
        
  vertex_extra:
    seq:
      - id: unknown0
        type: f4
      - id: unknown1
        type: f4
      - id: unknown2
        type: f4
      - id: unknown3
        type: f4
      - id: unknown4
        type: f4
      - id: unknown5
        type: f4
      - id: unknown6
        type: f4
      - id: unknown7
        type: f4
      - id: offset_something
        type: u4
        
  triangle_index:
    seq:
      - id: ix
        type: u2
      - id: iy
        type: u2
      - id: iz
        type: u2
  
  fxyzw:
    seq:
      - id: x
        type: f4
      - id: y
        type: f4
      - id: z
        type: f4
      - id: w
        type: f4
    
  stride_12:
    seq:
      - id: x
        type: s2
      - id: y
        type: s2
      - id: z
        type: s2
      - id: u
        type: s2
      - id: v
        type: s2
        
  stride_18:
    seq:
      - id: x
        type: s2
      - id: y
        type: s2
      - id: z
        type: s2
      - id: u
        type: s2
      - id: v
        type: s2
        
  stride_22:
    seq:
      - id: unknown0
        type: u1
      - id: x
        type: s2
      - id: y
        type: s2
      - id: z
        type: s2
      - id: unknown1
        type: u1
      - id: nx
        type: s2
      - id: nyve
        type: s2
      - id: nz
        type: s2
      - id: u
        type: s2
      - id: v
        type: s2
      - id: xxa
        type: s2
      - id: xxb
        type: s2

meta:
  id: vexx
  file-extension: vex
  endian: le

seq:
  - id: header
    type: header
  - id: nodes
    size: header.nodes_size
    type:
      switch-on: header.version
      cases:
        "3": node_v4
        "4": node_v4
        "6": node_v6
        
enums:
  node_type_v4:
    0x000: group 
    0x06d: transform 
    0x0ee: world 
    0x0f1: camera 
    0x101: curve_shape 
    0x11c: nurbs_surface 
    0x11e: mesh 
    0x125: ambient_light 
    0x128: point_light 
    0x12a: directional_light 
    0x2de: lod_group 
    0x36b: floor_collision 
    0x36c: wall_collision 
    0x36d: wo_track 
    0x36e: start_position 
    0x36f: speedup_pad 
    0x370: weapon_pad 
    0x371: engine_flare 
    0x372: anim_transform 
    0x373: texture 
    0x374: dynamic_point_light 
    0x375: dynamic_shadow_occluder 
    0x376: particle_system 
    0x377: airbrake 
    0x378: skycube 
    0x379: quake 
    0x37a: trail 
    0x37b: section 
    0x37c: gate 
    0x37d: shadow 
    0x37e: speaker 
    0x37f: reset_collision 
    0x380: wo_spot 
    0x381: wo_point 
    0x382: ship_collision_fx 
    0x385: fog_cube 
    0x386: mesh_node_ghost 
    0x387: seaweed 
    0x388: sea 
    0x389: sea_reflect 
    0x38a: cloud_cube 
    0x38b: cloud_group 
    0x38c: weather_position 
    0x38d: unused_1 
    0x38e: animation_trigger 
    0x38f: grid_camera 
    0x390: lens_flare 
    0x391: texture_blob 
    0x392: blob 
    0x393: sound 
    0x394: ship_muzzle 
    0x396: exit_glow 
    0x397: engine_fire
    
  node_type_v6:
    0x000: group
    0x06e: transform
    0x0f4: world
    0x0f7: camera
    0x101: curve_shape
    0x125: mesh
    0x12c: ambient_light
    0x123: nurbs_surface
    0x131: directional_light
    0x132: point_light
    0x2ee: lod_group
    0x3b9: floor_collision
    0x3ba: wall_collision
    0x3bb: wo_track
    0x3bc: start_position
    0x3bd: speedup_pad
    0x3be: weapon_pad
    0x3bf: engine_flare
    0x3c0: anim_transform
    0x3c1: texture
    0x3c2: dynamic_point_light
    0x3c3: dynamic_shadow_occluder
    0x3c4: particle_system
    0x3c5: airbrake
    0x3c6: skycube
    0x3c7: quake
    0x3c8: trail
    0x3c9: section
    0x3ca: gate
    0x3cb: shadow
    0x3cc: speaker
    0x3cd: reset_collision
    0x3ce: wo_spot
    0x3cf: wo_point
    0x3d0: ship_collision_fx
    0x3d3: fog_cube
    0x3d4: mesh_node_ghost
    0x3d5: seaweed
    0x3d6: sea
    0x3d7: sea_reflect
    0x3d8: cloud_cube
    0x3d9: cloud_group
    0x3da: weather_position
    0x3db: unused_1
    0x3dc: animation_trigger
    0x3dd: grid_camera
    0x3de: lens_flare
    0x3df: texture_blob
    0x3e0: blob
    0x3e1: sound
    0x3e9: sound_cone
    0x3e2: ship_muzzle
    0x3e4: exit_glow
    0x3e5: engine_fire
    0x3e6: mag_floor_collision
    0x3e7: cage_collision
    0x3eb: canon_flash

  gu_primitive:
    0: points
    1: lines
    2: line_strip
    3: triangles
    4: triangle_strip
    5: triangle_fan
    6: sprites
    
types:
  header:
    seq:
      - id: version
        type: u4
      - id: nodes_size
        type: u4
      - id: textures_size
        type: u4
      - id: magic
        type: str
        size: 4
        encoding: ascii
  
  node_v4:
    seq:
      - id: type
        type: u4
        enum: node_type_v4
      - id: header_size
        type: u2
      - id: unknown1
        type: u2
      - id: data_size
        type: u4
      - id: children_count
        type: u2
      - id: unknown2
        type: u2
      - id: name
        type: str
        encoding: ascii
        size: header_size - 16
      - id: data
        size: data_size
        type:
          switch-on: type
          cases:
            "node_type_v4::texture": data_texture
            "node_type_v4::mesh": data_mesh
      - id: children
        type: node_v4
        repeat: expr
        repeat-expr: children_count
        if: "children_count > 0"
        
  node_v6:
    seq:
      - id: type
        type: u4
        enum: node_type_v6
      - id: header_size
        type: u2
      - id: unknown1
        type: u2
      - id: data_size
        type: u4
      - id: children_count
        type: u2
      - id: unknown2
        type: u2
      - id: name
        type: str
        encoding: ascii
        size: header_size - 16
      - id: data
        size: data_size
        type:
          switch-on: type
          cases:
            "node_type_v6::texture": data_texture
            "node_type_v6::mesh": data_mesh
      - id: children
        type: node_v6
        repeat: expr
        repeat-expr: children_count
        if: "children_count > 0"

  f4_4:
    seq:
      - id: x
        type: f4
      - id: y
        type: f4
      - id: z
        type: f4
      - id: w
        type: f4
  
  mat4:
    seq:
      - id: row
        type: f4_4
        repeat: expr
        repeat-expr: 4
        
  data_aabb:
    seq:
      - id: min
        type: f4_4
      - id: max
        type: f4_4
  
  data_mesh_info:
    seq:
      - id: unknown1
        type: u1
      - id: unknown2
        type: u1
      - id: unknown3
        type: u2
      - id: texture_id
        type: u4
      - id: more
        size: 12

  data_mesh_chunk_header:
    seq:
      - id: signature
        type: u2
      - id: id
        type: u1
      - id: unknown1
        type: u1
      - id: stride_count1
        type: u2
      - id: stride_count2
        type: u2
      - id: primitive_type
        type: u1
        enum: gu_primitive
      - id: unknown2
        type: u1
      - id: vtxdef
        type: u2
      - id: size1
        type: u2
      - id: size2
        type: u2

  data_mesh_chunk:
    seq:
      - id: header
        type: data_mesh_chunk_header
      - id: data
        size: header.size1 + 0x30
        if: header.size1  + 0x30 < _io.size - _io.pos
        
  data_mesh_vertices:
    params:
      - id: vtxdef
        type: u2
      - id: count
        type: u2
    seq:
      - id: vertices319
        size: 24
        repeat: expr
        repeat-expr: count
        if: vtxdef == 319
        
      - id: vertices700
        size: 20
        repeat: expr
        repeat-expr: count
        if: vtxdef == 700
        
      - id: vertices2580
        size: 24
        repeat: expr
        repeat-expr: count
        if: vtxdef == 2580   
        
  data_mesh:
    seq:
      - id: type
        type: u2
      - id: mesh_count
        type: u2
      - id: length1
        type: u4
      - id: length2
        type: u4
      - id: maybe_padding2
        size: 4
      - id: aabb
        type: data_aabb
      - id: infos
        type: data_mesh_info
        repeat: expr
        repeat-expr: mesh_count
      - id: padding
        size: 16 - _io.pos % 16
        
      - id: unknown1
        size: 0x1E0
        if: type == 0xA293
      - id: unknown2
        size: 0x60
        if: type == 0x1891
        
      - id: chunks
        type: data_mesh_chunk
        repeat: expr
        repeat-expr: mesh_count
  
  data_tranform:
    seq:
      - id: matrix
        size: 0
        
  data_texture:
    seq:
      - id: width
        type: u2
      - id: height
        type: u2
      - id: bbp
        type: u1
      - id: unk1
        type: u1
      - id: format
        type: u1
      - id: id
        type: u1
      - id: cmap_size
        type: u4
      - id: data_size
        type: u4
      - id: padding
        size: 8
      - id: unk2
        type: f4
      - id: r
        type: u1
      - id: g
        type: u1
      - id: b
        type: u1
      - id: a
        type: u1
      - id: unk3
        size: 8
      - id: unk4
        size: 8
      - id: unk5
        size: 8
      - id: name
        type: str
        encoding: ascii
        terminator: 0
        

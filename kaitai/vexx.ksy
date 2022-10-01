meta:
  id: vexx
  file-extension: vex
  endian: le

seq:
  - id: header
    type: header
  - id: nodes
    size: header.nodes_size
    type: node

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
  node:
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
      - id: children
        type: node
        repeat: expr
        repeat-expr: children_count
        
      
        
        
        

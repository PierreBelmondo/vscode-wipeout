
import * as THREE from "three";

import { rcsHash } from "@core/formats/rcs/ids";
import { MaterialFactory } from "./_abstract";

// Generated from the engine's own shaders by scripts/gen-materials.ts.
import { m_01_normal_diffuse_specularonalpha_lh_gen } from "./generated/01_normal_diffuse_specularonalpha_lh";
import { m_01_normal_diffuse_specularonalpha_gen } from "./generated/01_normal_diffuse_specularonalpha";
import { m_2diffuse_plus_spec_blend_via_alpha_n_gen } from "./generated/2diffuse_plus_spec_blend_via_alpha_n";
import { m_2rocksandblend_via_diffuse_gen } from "./generated/2rocksandblend_via_diffuse";
import { m_2uv_offset_lights_gen } from "./generated/2uv_offset_lights";
import { aa_defuse_reflect_gen } from "./generated/aa_defuse_reflect";
import { aa_glass_reflect_opacity_normal_gen } from "./generated/aa_glass_reflect_opacity_normal";
import { ab_diff_spec_facing_gen } from "./generated/ab_diff_spec_facing";
import { aimi_text_gen } from "./generated/aimi_text";
import { alpha_emissive_gen } from "./generated/alpha_emissive";
import { and_anim_spec_gen } from "./generated/and_anim_spec";
import { and_arrowmaterial_gen } from "./generated/and_arrowmaterial";
import { and_diff_emiss_scale_gen } from "./generated/and_diff_emiss_scale";
import { and_diffuse_2nduvfor_alpha_gen } from "./generated/and_diffuse_2nduvfor_alpha";
import { and_diffuse_emissive_spec_gen } from "./generated/and_diffuse_emissive_spec";
import { and_diffuse_emissive_gen } from "./generated/and_diffuse_emissive";
import { and_diffuse_vertex_colour_gen } from "./generated/and_diffuse_vertex_colour";
import { and_glass_normscale_gen } from "./generated/and_glass_normscale";
import { and_hardlightsnofog1_gen } from "./generated/and_hardlightsnofog1";
import { and_rocktosand_gen } from "./generated/and_rocktosand";
import { and_spec_colourcontrol_gen } from "./generated/and_spec_colourcontrol";
import { and_spec_power_gen } from "./generated/and_spec_power";
import { and_tunnelmat_gen } from "./generated/and_tunnelmat";
import { and_waterfall_gen } from "./generated/and_waterfall";
import { animating_traffic_gen } from "./generated/animating_traffic";
import { animhexlights_gen } from "./generated/animhexlights";
import { animlights_gen } from "./generated/animlights";
import { art2_basic_gen } from "./generated/art2_basic";
import { aurora_gen } from "./generated/aurora";
import { base_diffusealphaemissive_gen } from "./generated/base_diffusealphaemissive";
import { base_diffusespecular_gen } from "./generated/base_diffusespecular";
import { basicalpha_gen } from "./generated/basicalpha";
import { basicnonalpha_gen } from "./generated/basicnonalpha";
import { basic_uv_scroll_gen } from "./generated/basic_uv_scroll";
import { basic_vertexemissive_gen } from "./generated/basic_vertexemissive";
import { billboarddiffuse_gen } from "./generated/billboarddiffuse";
import { biodome_noalpha_gen } from "./generated/biodome_noalpha";
import { biodome_reflect_gen } from "./generated/biodome_reflect";
import { blimphulloneuv_gen } from "./generated/blimphulloneuv";
import { blimphull_gen } from "./generated/blimphull";
import { bluemetal_gen } from "./generated/bluemetal";
import { carbonfibre_gen } from "./generated/carbonfibre";
import { cf_321_zone_gen } from "./generated/cf_321_zone";
import { cf_add_point_gen } from "./generated/cf_add_point";
import { cf_alpha4emissive_gen } from "./generated/cf_alpha4emissive";
import { cf_alpha4glow1_gen } from "./generated/cf_alpha4glow1";
import { cf_alpha4glow_gen } from "./generated/cf_alpha4glow";
import { cf_anulpha_glow_gen } from "./generated/cf_anulpha_glow";
import { cf_basicvertexalpha_gen } from "./generated/cf_basicvertexalpha";
import { cf_billboard1_gen } from "./generated/cf_billboard1";
import { cf_blimplights_anim_gen } from "./generated/cf_blimplights_anim";
import { cf_centre_plasma_pulse_gen } from "./generated/cf_centre_plasma_pulse";
import { cf_cheap_crowd_gen } from "./generated/cf_cheap_crowd";
import { cf_chenghou_sign_2uv_gen } from "./generated/cf_chenghou_sign_2uv";
import { cf_chenghou_sign_gen } from "./generated/cf_chenghou_sign";
import { cf_chevron_pulse_gen } from "./generated/cf_chevron_pulse";
import { cf_constantcolourglow_ramp_02_gen } from "./generated/cf_constantcolourglow_ramp_02";
import { cf_constantcolourglow_ramp_03_gen } from "./generated/cf_constantcolourglow_ramp_03";
import { cf_constantcolourglow_ramp_04_gen } from "./generated/cf_constantcolourglow_ramp_04";
import { cf_constantcolourglow_gen } from "./generated/cf_constantcolourglow";
import { cf_diff_spec_gen } from "./generated/cf_diff_spec";
import { cf_fetracks_backfacecull_gen } from "./generated/cf_fetracks_backfacecull";
import { cf_fetracks_gen } from "./generated/cf_fetracks";
import { cf_fx350_gen } from "./generated/cf_fx350";
import { cf_glow_tube_gen } from "./generated/cf_glow_tube";
import { cf_icetunnel_gen } from "./generated/cf_icetunnel";
import { cf_laserrail_cap_gen } from "./generated/cf_laserrail_cap";
import { cf_laserrail_gen } from "./generated/cf_laserrail";
import { cf_offset_animated_lights_gen } from "./generated/cf_offset_animated_lights";
import { cf_plasma_glow2_gen } from "./generated/cf_plasma_glow2";
import { cf_plasma_glow3_gen } from "./generated/cf_plasma_glow3";
import { cf_plasma_glow_gen } from "./generated/cf_plasma_glow";
import { cf_stadiumad_anim_gen } from "./generated/cf_stadiumad_anim";
import { cf_startbeam_glow_gen } from "./generated/cf_startbeam_glow";
import { cf_treetrunk_gen } from "./generated/cf_treetrunk";
import { cf_tree_gen } from "./generated/cf_tree";
import { cf_uvanim_emssivealpha_gen } from "./generated/cf_uvanim_emssivealpha";
import { cf_uvanim_emssive_glowtint_alpha_gen } from "./generated/cf_uvanim_emssive_glowtint_alpha";
import { cf_uvanim_emssive_glowtint_gen } from "./generated/cf_uvanim_emssive_glowtint";
import { cf_uvanim_emssive_gen } from "./generated/cf_uvanim_emssive";
import { cf_vex_billboard_gen } from "./generated/cf_vex_billboard";
import { cf_vex_billoard_glow_gen } from "./generated/cf_vex_billoard_glow";
import { cf_waterfall_gen } from "./generated/cf_waterfall";
import { cf_wingshader_gen } from "./generated/cf_wingshader";
import { chevron_facing_material_gen } from "./generated/chevron_facing_material";
import { chevron_pulse_gen } from "./generated/chevron_pulse";
import { clouds_gen } from "./generated/clouds";
import { cl_tunnelrefraction_gen } from "./generated/cl_tunnelrefraction";
import { constantcolour_gen } from "./generated/constantcolour";
import { constantdiffuse_specular_normal_gen } from "./generated/constantdiffuse_specular_normal";
import { constantmaterial_gen } from "./generated/constantmaterial";
import { constantmaterial_vertalpha_gen } from "./generated/constantmaterial_vertalpha";
import { dc_constantglow_gen } from "./generated/dc_constantglow";
import { dc_diffuseemissive_gen } from "./generated/dc_diffuseemissive";
import { dc_diffusenormalspecular_gen } from "./generated/dc_diffusenormalspecular";
import { dc_diffusetexturealphaemissive_gen } from "./generated/dc_diffusetexturealphaemissive";
import { dc_diffusetextureemissiveinalpha_gen } from "./generated/dc_diffusetextureemissiveinalpha";
import { dc_diffuse_gen } from "./generated/dc_diffuse";
import { dc_emissivetexture_gen } from "./generated/dc_emissivetexture";
import { dc_flashingglow_gen } from "./generated/dc_flashingglow";
import { dc_flashing_lights_gen } from "./generated/dc_flashing_lights";
import { dc_glowlightband_gen } from "./generated/dc_glowlightband";
import { dc_hologramsigns_gen } from "./generated/dc_hologramsigns";
import { dc_hologramstars_gen } from "./generated/dc_hologramstars";
import { dc_hologramwithstatic2_gen } from "./generated/dc_hologramwithstatic2";
import { dc_hologramwithstatic_gen } from "./generated/dc_hologramwithstatic";
import { dc_lightcone_gen } from "./generated/dc_lightcone";
import { dc_metallic_gen } from "./generated/dc_metallic";
import { dc_railing_gen } from "./generated/dc_railing";
import { d_cs_gen } from "./generated/d_cs";
import { dc_whiteplasticanim_gen } from "./generated/dc_whiteplasticanim";
import { dc_whiteplastic_gen } from "./generated/dc_whiteplastic";
import { dc_windows_a_gen } from "./generated/dc_windows_a";
import { dc_windows_b_opaque_gen } from "./generated/dc_windows_b_opaque";
import { dc_windowstest_gen } from "./generated/dc_windowstest";
import { debris_gen } from "./generated/debris";
import { defuse_occulsion_vert_col_tint_gen } from "./generated/defuse_occulsion_vert_col_tint";
import { detonator_bomb_explosion_range_gen } from "./generated/detonator_bomb_explosion_range";
import { detonator_bomb_explosion_shockwave_gen } from "./generated/detonator_bomb_explosion_shockwave";
import { detonator_bomb_lightrays_gen } from "./generated/detonator_bomb_lightrays";
import { detonator_bomb_normal_equalisers_gen } from "./generated/detonator_bomb_normal_equalisers";
import { detonator_bomb_normal_gen } from "./generated/detonator_bomb_normal";
import { detonator_bomb_rays_plain_gen } from "./generated/detonator_bomb_rays_plain";
import { detonator_bulletgaugesegments_gen } from "./generated/detonator_bulletgaugesegments";
import { detonator_colours_dg_gen } from "./generated/detonator_colours_dg";
import { detonator_deathshell_gen } from "./generated/detonator_deathshell";
import { detonator_diffuse_vcol_gen } from "./generated/detonator_diffuse_vcol";
import { detonator_diffuse_with_specular_from_alpha_n_vcol_gen } from "./generated/detonator_diffuse_with_specular_from_alpha_n_vcol";
import { detonator_emissive_bloom_gen } from "./generated/detonator_emissive_bloom";
import { detonator_leacheffectmat_gen } from "./generated/detonator_leacheffectmat";
import { detonator_mine_normal_alpha_gen } from "./generated/detonator_mine_normal_alpha";
import { detonator_shield_plasma1_gen } from "./generated/detonator_shield_plasma1";
import { detonator_shield_plasma_gen } from "./generated/detonator_shield_plasma";
import { detonator_shield_gen } from "./generated/detonator_shield";
import { detonator_ship_dg_iridescent_gen } from "./generated/detonator_ship_dg_iridescent";
import { detonator_ship_rich_iridescent_gen } from "./generated/detonator_ship_rich_iridescent";
import { dg_zonelights1_gen } from "./generated/dg_zonelights1";
import { diffusealfa4opacity_specscalar_gen } from "./generated/diffusealfa4opacity_specscalar";
import { diffusealpha4spec_scalar_gen } from "./generated/diffusealpha4spec_scalar";
import { diffuse_alpha_gen } from "./generated/diffuse_alpha";
import { diffuse_colourtint_diff_spec_facing_gen } from "./generated/diffuse_colourtint_diff_spec_facing";
import { diffuse_colourtint_seperate_specular_gen } from "./generated/diffuse_colourtint_seperate_specular";
import { diffuse_colourtint_specular_gen } from "./generated/diffuse_colourtint_specular";
import { diffuse_colourtint_gen } from "./generated/diffuse_colourtint";
import { diffuse_emissive_alpha_glow_gen } from "./generated/diffuse_emissive_alpha_glow";
import { diffuse_emissive_alpha_glow_v01_gen } from "./generated/diffuse_emissive_alpha_glow_v01";
import { diffuseemissivealphaspecular_gen } from "./generated/diffuseemissivealphaspecular";
import { diffuse_emissive_alpha_gen } from "./generated/diffuse_emissive_alpha";
import { diffuse_emissive_gen } from "./generated/diffuse_emissive";
import { diffuse_emissive_with_specular_from_alpha_gen } from "./generated/diffuse_emissive_with_specular_from_alpha";
import { diffuse_normal_specular_emmissive_alpha_gen } from "./generated/diffuse_normal_specular_emmissive_alpha";
import { diffuse_normal_specular_emmissive_gen } from "./generated/diffuse_normal_specular_emmissive";
import { diffuse_normal_specular_gen } from "./generated/diffuse_normal_specular";
import { diffuse_overlay_gen } from "./generated/diffuse_overlay";
import { diffuse_plus_alpha_gen } from "./generated/diffuse_plus_alpha";
import { diffuse_reflection_gen } from "./generated/diffuse_reflection";
import { diffuse_spec_constant_gen } from "./generated/diffuse_spec_constant";
import { diffuse_spec_fresnel_emissive_gen } from "./generated/diffuse_spec_fresnel_emissive";
import { diffuse_spec_fresnel_gen } from "./generated/diffuse_spec_fresnel";
import { diffuse_specular_basic_gen } from "./generated/diffuse_specular_basic";
import { diffuse_specular_fresnel_gen } from "./generated/diffuse_specular_fresnel";
import { diffuse_specular_gen } from "./generated/diffuse_specular";
import { diffuse_specular_v01_gen } from "./generated/diffuse_specular_v01";
import { diffuse_texture_emissivealphascalar_colourtint_gen } from "./generated/diffuse_texture_emissivealphascalar_colourtint";
import { diffusetextureemissivealphascalar_gen } from "./generated/diffusetextureemissivealphascalar";
import { diffusetextureemissivetexture_gen } from "./generated/diffusetextureemissivetexture";
import { diffuse_gen } from "./generated/diffuse";
import { diffuse_vcol_gen } from "./generated/diffuse_vcol";
import { diffusewithalphachannel_gen } from "./generated/diffusewithalphachannel";
import { diffuse_with_specular_and_alpha_gen } from "./generated/diffuse_with_specular_and_alpha";
import { diffuse_with_specular_from_alpha_n_gen } from "./generated/diffuse_with_specular_from_alpha_n";
import { diffuse_with_specular_from_alpha_n_vcol_gen } from "./generated/diffuse_with_specular_from_alpha_n_vcol";
import { diffuse_with_specular_from_alpha_scalar_gen } from "./generated/diffuse_with_specular_from_alpha_scalar";
import { diffuse_with_specular_from_alpha_gen } from "./generated/diffuse_with_specular_from_alpha";
import { diffuse_with_specular_from_alpha_vcol_gen } from "./generated/diffuse_with_specular_from_alpha_vcol";
import { diffuse_with_specular_oppos_alpha_gen } from "./generated/diffuse_with_specular_oppos_alpha";
import { dn_diffuse_specular_emiss_glow_gen } from "./generated/dn_diffuse_specular_emiss_glow";
import { dn_diffuse_specular_emiss_gen } from "./generated/dn_diffuse_specular_emiss";
import { dn_diffuse_specular_gen } from "./generated/dn_diffuse_specular";
import { ds_booth_glass_gen } from "./generated/ds_booth_glass";
import { ds_diffuse_normal_specular_reflective_gen } from "./generated/ds_diffuse_normal_specular_reflective";
import { d_s_n_customr_gen } from "./generated/d_s_n_customr";
import { d_s_n_r_gen } from "./generated/d_s_n_r";
import { d_s_n_r_uvflip_gen } from "./generated/d_s_n_r_uvflip";
import { electricity_gen } from "./generated/electricity";
import { emissive_alpha_heathaze_noalpha_gen } from "./generated/emissive_alpha_heathaze_noalpha";
import { emissive_alpha_heathaze_test_gen } from "./generated/emissive_alpha_heathaze_test";
import { emissivealphalights_gen } from "./generated/emissivealphalights";
import { emissive_alpha_pvs_gen } from "./generated/emissive_alpha_pvs";
import { emissivealpha_gen } from "./generated/emissivealpha";
import { emissive_bloom_gen } from "./generated/emissive_bloom";
import { emissive_constant_gen } from "./generated/emissive_constant";
import { emissive_lights_gen } from "./generated/emissive_lights";
import { emissivetexture_bright_gen } from "./generated/emissivetexture_bright";
import { emissivetexture_gen } from "./generated/emissivetexture";
import { emissive_gen } from "./generated/emissive";
import { empgauge_rays_gen } from "./generated/empgauge_rays";
import { empgauge_gen } from "./generated/empgauge";
import { etched_glass_amph_gen } from "./generated/etched_glass_amph";
import { etched_glass_tech_gen } from "./generated/etched_glass_tech";
import { etched_glass_gen } from "./generated/etched_glass";
import { explosion_kaleidoscopic_gen } from "./generated/explosion_kaleidoscopic";
import { fence_alpha_gen } from "./generated/fence_alpha";
import { flame_test_gen } from "./generated/flame_test";
import { glass_2nduvfor_glow_gen } from "./generated/glass_2nduvfor_glow";
import { glass_2nduv_glow_gen } from "./generated/glass_2nduv_glow";
import { glass_2nduv_reflect_glow_gen } from "./generated/glass_2nduv_reflect_glow";
import { glass_2uv_rgb_reflect_glow_gen } from "./generated/glass_2uv_rgb_reflect_glow";
import { glass_2uv_rgb_reflect_normal_glow_gen } from "./generated/glass_2uv_rgb_reflect_normal_glow";
import { glassalpha_customr_gen } from "./generated/glassalpha_customr";
import { glassalpha_gen } from "./generated/glassalpha";
import { glass_colour_spec_trans_gen } from "./generated/glass_colour_spec_trans";
import { glass_glow_gen } from "./generated/glass_glow";
import { glass_reflect_normal_gen } from "./generated/glass_reflect_normal";
import { glass_reflect_opacity_normal_gen } from "./generated/glass_reflect_opacity_normal";
import { glass_reflect_opacity_gen } from "./generated/glass_reflect_opacity";
import { glass_reflect_seperateopacity_normal_gen } from "./generated/glass_reflect_seperateopacity_normal";
import { glass_reflect_gen } from "./generated/glass_reflect";
import { glasstestnoalpha_gen } from "./generated/glasstestnoalpha";
import { glasstest_gen } from "./generated/glasstest";
import { glass_texture_clamped_gen } from "./generated/glass_texture_clamped";
import { glass_texture_customr_gen } from "./generated/glass_texture_customr";
import { glass_texture_n_gen } from "./generated/glass_texture_n";
import { glass_texture_gen } from "./generated/glass_texture";
import { glass_texture_wrecked_gen } from "./generated/glass_texture_wrecked";
import { glow_transparent_overlay_gen } from "./generated/glow_transparent_overlay";
import { gradientcolour1_gen } from "./generated/gradientcolour1";
import { grass_overlay_gen } from "./generated/grass_overlay";
import { hd_absorbinternal_gen } from "./generated/hd_absorbinternal";
import { hd_bomb_emissive_gen } from "./generated/hd_bomb_emissive";
import { hd_bombfire_bloomring_gen } from "./generated/hd_bombfire_bloomring";
import { hd_bombfire_glow_gen } from "./generated/hd_bombfire_glow";
import { hd_bombfire_shockwaves_glow_gen } from "./generated/hd_bombfire_shockwaves_glow";
import { hd_bomb_halo_gen } from "./generated/hd_bomb_halo";
import { hd_bomb_gen } from "./generated/hd_bomb";
import { hd_detonator_cannonbolt_halo_gen } from "./generated/hd_detonator_cannonbolt_halo";
import { hd_enginetrail_bluered_gen } from "./generated/hd_enginetrail_bluered";
import { hd_enginetrail_gen } from "./generated/hd_enginetrail";
import { hd_leachbeam_ball_glow_gen } from "./generated/hd_leachbeam_ball_glow";
import { hd_leachbeam_bloomring_gen } from "./generated/hd_leachbeam_bloomring";
import { hd_leachbeam_gen } from "./generated/hd_leachbeam";
import { hd_mine_beacon_rays_gen } from "./generated/hd_mine_beacon_rays";
import { hd_mine_beacon_gen } from "./generated/hd_mine_beacon";
import { hd_mine_halo_gen } from "./generated/hd_mine_halo";
import { hd_missile_explosion_core_glow_gen } from "./generated/hd_missile_explosion_core_glow";
import { hd_missile_explosion_lightrays_glow_gen } from "./generated/hd_missile_explosion_lightrays_glow";
import { hd_missile_explosion_shockwaves_glow_gen } from "./generated/hd_missile_explosion_shockwaves_glow";
import { hd_muzzleflash_gen } from "./generated/hd_muzzleflash";
import { hd_plasmahalo_glow_gen } from "./generated/hd_plasmahalo_glow";
import { hd_plasmaring_glow_gen } from "./generated/hd_plasmaring_glow";
import { hd_rocket_surface1_gen } from "./generated/hd_rocket_surface1";
import { hd_rockettrail_shadow_gen } from "./generated/hd_rockettrail_shadow";
import { hd_rockettrail_gen } from "./generated/hd_rockettrail";
import { hd_waketrail_gen } from "./generated/hd_waketrail";
import { hexagonalshield_alpha_gen } from "./generated/hexagonalshield_alpha";
import { hexagonalshield_rich_gen } from "./generated/hexagonalshield_rich";
import { hexagonalshield_gen } from "./generated/hexagonalshield";
import { hologram_strip_spec_gen } from "./generated/hologram_strip_spec";
import { hologram_strip_gen } from "./generated/hologram_strip";
import { hologram_gen } from "./generated/hologram";
import { holographic_projector2_gen } from "./generated/holographic_projector2";
import { holographic_test_gen } from "./generated/holographic_test";
import { j_alphascalar_gen } from "./generated/j_alphascalar";
import { jd_2uvoverlayspecular_gen } from "./generated/jd_2uvoverlayspecular";
import { jd_2uvoverlay_gen } from "./generated/jd_2uvoverlay";
import { jd_alphalambert_alphatest_gen } from "./generated/jd_alphalambert_alphatest";
import { jd_alphalambert_test_gen } from "./generated/jd_alphalambert_test";
import { jd_alphalambert_gen } from "./generated/jd_alphalambert";
import { jd_alphaspecular_gen } from "./generated/jd_alphaspecular";
import { j_diffuse_colour_tint_spec_gen } from "./generated/j_diffuse_colour_tint_spec";
import { jd_lambertalpha_gen } from "./generated/jd_lambertalpha";
import { jd_landinglights_gen } from "./generated/jd_landinglights";
import { jd_simplelambert_gen } from "./generated/jd_simplelambert";
import { jd_simplespecular_gen } from "./generated/jd_simplespecular";
import { jd_spec2uvoverlay_gen } from "./generated/jd_spec2uvoverlay";
import { jd_uvanim_emissivealphamultiply_gen } from "./generated/jd_uvanim_emissivealphamultiply";
import { j_rgb_colourtintnormalreflect_gen } from "./generated/j_rgb_colourtintnormalreflect";
import { lambert_alpha_02_gen } from "./generated/lambert_alpha_02";
import { lambert_alpha_v02_gen } from "./generated/lambert_alpha_v02";
import { lambertemissive_gen } from "./generated/lambertemissive";
import { lambert_simple_gen } from "./generated/lambert_simple";
import { lambert_spec_mult_emissive_scroll_gen } from "./generated/lambert_spec_mult_emissive_scroll";
import { lambert_spec_mult_scroll_gen } from "./generated/lambert_spec_mult_scroll";
import { lambert_spec_mult_gen } from "./generated/lambert_spec_mult";
import { lambert_spec_reflect_mult_emissive_gen } from "./generated/lambert_spec_reflect_mult_emissive";
import { lambert_spec_reflect_mult_gen } from "./generated/lambert_spec_reflect_mult";
import { lambert_gen } from "./generated/lambert";
import { lambertzeroalpha_gen } from "./generated/lambertzeroalpha";
import { leacheffectmat_gen } from "./generated/leacheffectmat";
import { lightbarrierframeglow_gen } from "./generated/lightbarrierframeglow";
import { lightbarrierpanel_new_additive_rays_gen } from "./generated/lightbarrierpanel_new_additive_rays";
import { lightbarrierpanel_new_additive_gen } from "./generated/lightbarrierpanel_new_additive";
import { lightbarrierpanel_new_gen } from "./generated/lightbarrierpanel_new";
import { lightbarriershockwave_gen } from "./generated/lightbarriershockwave";
import { loopmaterial_gen } from "./generated/loopmaterial";
import { loop_the_loop_caps_gen } from "./generated/loop_the_loop_caps";
import { mageffect08_floor_gen } from "./generated/mageffect08_floor";
import { mageffect08_lh_gen } from "./generated/mageffect08_lh";
import { mageffect08_gen } from "./generated/mageffect08";
import { mag_effect_loop_opaque_gen } from "./generated/mag_effect_loop_opaque";
import { mageffectloop_gen } from "./generated/mageffectloop";
import { mageffect_modded_gen } from "./generated/mageffect_modded";
import { mar_diffuse_specular_gen } from "./generated/mar_diffuse_specular";
import { martin_inflatable2_gen } from "./generated/martin_inflatable2";
import { martin_inflatable_gen } from "./generated/martin_inflatable";
import { m_diffuse_normal_constantspecular_gen } from "./generated/m_diffuse_normal_constantspecular";
import { medal_gen } from "./generated/medal";
import { mesh_colour_constant_gen } from "./generated/mesh_colour_constant";
import { metallic_gen } from "./generated/metallic";
import { mr_2nduvanimdiffuseemissive_gen } from "./generated/mr_2nduvanimdiffuseemissive";
import { mr_coloured_specular_gen } from "./generated/mr_coloured_specular";
import { mr_diffuse_emissive_alpha_glow_specular_gen } from "./generated/mr_diffuse_emissive_alpha_glow_specular";
import { mr_shopwin_reflecttranspemis_gen } from "./generated/mr_shopwin_reflecttranspemis";
import { mr_stem_gen } from "./generated/mr_stem";
import { mr_uvanim_em_alpha_gen } from "./generated/mr_uvanim_em_alpha";
import { mr_uvanim_em_glow_gen } from "./generated/mr_uvanim_em_glow";
import { mr_waterfall_gen } from "./generated/mr_waterfall";
import { mt_2uv_fresnel_gen } from "./generated/mt_2uv_fresnel";
import { mt_additive_glow_outline_gen } from "./generated/mt_additive_glow_outline";
import { mt_additive_glow_gen } from "./generated/mt_additive_glow";
import { mt_diffuse_alpha_invert_gen } from "./generated/mt_diffuse_alpha_invert";
import { mt_diffuse_glow_specular_01_gen } from "./generated/mt_diffuse_glow_specular_01";
import { mt_diffuse_glow_specular_gen } from "./generated/mt_diffuse_glow_specular";
import { mt_diffuse_specular_gen } from "./generated/mt_diffuse_specular";
import { mt_tunnelrefraction_gen } from "./generated/mt_tunnelrefraction";
import { mt_uvanim_diffuse_emissive2_gen } from "./generated/mt_uvanim_diffuse_emissive2";
import { mt_uvanim_diffuse_emissive3tokey_gen } from "./generated/mt_uvanim_diffuse_emissive3tokey";
import { mt_uvanim_diffuse_emissive3tokey_v_scroll_gen } from "./generated/mt_uvanim_diffuse_emissive3tokey_v_scroll";
import { mt_uvanim_diffuse_emissive_gen } from "./generated/mt_uvanim_diffuse_emissive";
import { mt_windows_a_gen } from "./generated/mt_windows_a";
import { mt_windows_c_opaque_gen } from "./generated/mt_windows_c_opaque";
import { nitro_body_new_gen } from "./generated/nitro_body_new";
import { nitro_body_gen } from "./generated/nitro_body";
import { nitro_emissive_outlines_gen } from "./generated/nitro_emissive_outlines";
import { nitrogauge_new_gen } from "./generated/nitrogauge_new";
import { nitro_perspex_debris_gen } from "./generated/nitro_perspex_debris";
import { nitro_perspex_new_gen } from "./generated/nitro_perspex_new";
import { nr_alphatransparentholo_gen } from "./generated/nr_alphatransparentholo";
import { nr_billboardholographicscanlines_gen } from "./generated/nr_billboardholographicscanlines";
import { nr_crowd_bustle_gen } from "./generated/nr_crowd_bustle";
import { nr_facinglcdstrips_gen } from "./generated/nr_facinglcdstrips";
import { nr_greyscale2colour_gen } from "./generated/nr_greyscale2colour";
import { nr_holobowlparallax_gen } from "./generated/nr_holobowlparallax";
import { nr_lcd_strips_alpha_gen } from "./generated/nr_lcd_strips_alpha";
import { nr_pixellate_gen } from "./generated/nr_pixellate";
import { nr_scalinguvs_gen } from "./generated/nr_scalinguvs";
import { nr_splitrgbscreen_gen } from "./generated/nr_splitrgbscreen";
import { nr_tvarray_02_gen } from "./generated/nr_tvarray_02";
import { nr_twinblend_gen } from "./generated/nr_twinblend";
import { ns_adbanner_gen } from "./generated/ns_adbanner";
import { orange_glass_gen } from "./generated/orange_glass";
import { outerstripeseffect_gen } from "./generated/outerstripeseffect";
import { outersurround01_gen } from "./generated/outersurround01";
import { pb_diffalphaspecemmisive_jd_gen } from "./generated/pb_diffalphaspecemmisive_jd";
import { pb_diffalphaspecnormal_gen } from "./generated/pb_diffalphaspecnormal";
import { pb_diffspecemiss_gen } from "./generated/pb_diffspecemiss";
import { pb_diffusealfa4opacity_specscalar_gen } from "./generated/pb_diffusealfa4opacity_specscalar";
import { pb_diffusealpha4spec_gen } from "./generated/pb_diffusealpha4spec";
import { pb_glass_2nduv_reflect_specular1_glow_gen } from "./generated/pb_glass_2nduv_reflect_specular1_glow";
import { pb_rooftop_das_g_r_gen } from "./generated/pb_rooftop_das_g_r";
import { pb_window_o_gen } from "./generated/pb_window_o";
import { pb_window_gen } from "./generated/pb_window";
import { pipefx_v2_gen } from "./generated/pipefx_v2";
import { plasmasphere_glow_gen } from "./generated/plasmasphere_glow";
import { plasmasphere_subtractive_glow_gen } from "./generated/plasmasphere_subtractive_glow";
import { pvs_gen } from "./generated/pvs";
import { reflectplane_dc_seawateredging_gen } from "./generated/reflectplane_dc_seawateredging";
import { reflectplane_dc_seawater_gen } from "./generated/reflectplane_dc_seawater";
import { reticule1_gen } from "./generated/reticule1";
import { reversed_diffuse_specular_normal_gen } from "./generated/reversed_diffuse_specular_normal";
import { scanlinebillboard_alphaboost_gen } from "./generated/scanlinebillboard_alphaboost";
import { scanlinebillboard_desaturate_gen } from "./generated/scanlinebillboard_desaturate";
import { scanlinebillboard_gen } from "./generated/scanlinebillboard";
import { scanlinetext_gen } from "./generated/scanlinetext";
import { screen_test_gen } from "./generated/screen_test";
import { scroller_glow_v3_gen } from "./generated/scroller_glow_v3";
import { scroller_glow_v4_gen } from "./generated/scroller_glow_v4";
import { scrollingalpha_gen } from "./generated/scrollingalpha";
import { sebenco_ice_gen } from "./generated/sebenco_ice";
import { sebenco_snow_just_snow_gen } from "./generated/sebenco_snow_just_snow";
import { sebenco_snow_gen } from "./generated/sebenco_snow";
import { ship_lod_gen } from "./generated/ship_lod";
import { ship_lod_vcol_gen } from "./generated/ship_lod_vcol";
import { signcl_emissive_glow_gen } from "./generated/signcl_emissive_glow";
import { sign_emissive_alpha_gen } from "./generated/sign_emissive_alpha";
import { sign_emissive_glow2uv_gen } from "./generated/sign_emissive_glow2uv";
import { sign_emissive_glow_gen } from "./generated/sign_emissive_glow";
import { sign_emissive_gen } from "./generated/sign_emissive";
import { simplefogdiffuse_gen } from "./generated/simplefogdiffuse";
import { simpletextureandtexturealpha_gen } from "./generated/simpletextureandtexturealpha";
import { simpletextureandtexturealphauvoffsetscale_gen } from "./generated/simpletextureandtexturealphauvoffsetscale";
import { simpletexture_gen } from "./generated/simpletexture";
import { simpletextureuvoffsetscale_gen } from "./generated/simpletextureuvoffsetscale";
import { solar_iridescence_reflect_gen } from "./generated/solar_iridescence_reflect";
import { sourcerpulse_gen } from "./generated/sourcerpulse";
import { speedup_material_gen } from "./generated/speedup_material";
import { standard_diffuse_gen } from "./generated/standard_diffuse";
import { tech_de_ra_cloud_effect_gen } from "./generated/tech_de_ra_cloud_effect";
import { tech_de_ra_diffuse_spec_test_gen } from "./generated/tech_de_ra_diffuse_spec_test";
import { tech_de_ra_diffuse_spec_gen } from "./generated/tech_de_ra_diffuse_spec";
import { tech_de_ra_emissive_gen } from "./generated/tech_de_ra_emissive";
import { tech_de_ra_rock_floor_gen } from "./generated/tech_de_ra_rock_floor";
import { tech_de_ra_rocks_gen } from "./generated/tech_de_ra_rocks";
import { tech_lights_emissive_gen } from "./generated/tech_lights_emissive";
import { temp_glass_gen } from "./generated/temp_glass";
import { temp_testing_mat_colour_spec_alpha_gen } from "./generated/temp_testing_mat_colour_spec_alpha";
import { temp_testing_mat_diffuse_gen } from "./generated/temp_testing_mat_diffuse";
import { test_gen } from "./generated/test";
import { track_coloured_specular_alpha4glow_gen } from "./generated/track_coloured_specular_alpha4glow";
import { track_coloured_specular_gen } from "./generated/track_coloured_specular";
import { track_surface_no_emissive_gen } from "./generated/track_surface_no_emissive";
import { track_surface_gen } from "./generated/track_surface";
import { tracktexture_with_normal_gen } from "./generated/tracktexture_with_normal";
import { track_wall_gen } from "./generated/track_wall";
import { tunnel_fx_glass_gen } from "./generated/tunnel_fx_glass";
import { tunnel_fx_noalpha_mult_gen } from "./generated/tunnel_fx_noalpha_mult";
import { tunnel_fx_noalpha_gen } from "./generated/tunnel_fx_noalpha";
import { uv_anim_diffuse_alpha_emissive_gen } from "./generated/uv_anim_diffuse_alpha_emissive";
import { uv_anim_diffuse_alpha_gen } from "./generated/uv_anim_diffuse_alpha";
import { uvanim_diffuse_emissivealpha_gen } from "./generated/uvanim_diffuse_emissivealpha";
import { uvanim_diffuse_emissive_bloom_gen } from "./generated/uvanim_diffuse_emissive_bloom";
import { uvanim_diffuse_emissive_coltint_bloom_gen } from "./generated/uvanim_diffuse_emissive_coltint_bloom";
import { uvanim_diffuse_emissive_coltint_gen } from "./generated/uvanim_diffuse_emissive_coltint";
import { uvanim_diffuse_emissive_gen } from "./generated/uvanim_diffuse_emissive";
import { uvdistortion_diff_vertexcolplusoverlaybloom_gen } from "./generated/uvdistortion_diff_vertexcolplusoverlaybloom";
import { uvdistortion_diff_vertexcolplusoverlay_gen } from "./generated/uvdistortion_diff_vertexcolplusoverlay";
import { uvdistortion_diff_vertexcol_gen } from "./generated/uvdistortion_diff_vertexcol";
import { uv_distortion_gen } from "./generated/uv_distortion";
import { vertclr_diff_emissive_alpha_glow_gen } from "./generated/vertclr_diff_emissive_alpha_glow";
import { vertexcolourandtexturealpha_gen } from "./generated/vertexcolourandtexturealpha";
import { vertexcolourandtexture_gen } from "./generated/vertexcolourandtexture";
import { vertxclr_simplespec_gen } from "./generated/vertxclr_simplespec";
import { water_noref_gen } from "./generated/water_noref";
import { water_test_2_gen } from "./generated/water_test_2";
import { water_gen } from "./generated/water";
import { weapon_pads_gen } from "./generated/weapon_pads";
import { wes_billboardholographicscanlines_gen } from "./generated/wes_billboardholographicscanlines";
import { wes_diffuse_colourtint_specular_gen } from "./generated/wes_diffuse_colourtint_specular";
import { wes_grassvariant_gen } from "./generated/wes_grassvariant";
import { windowlight_gen } from "./generated/windowlight";
import { windowsdiffusespecular_nonemissive_customr_gen } from "./generated/windowsdiffusespecular_nonemissive_customr";
import { windowsnormaldiffusespecular_nonemissive_customr_gen } from "./generated/windowsnormaldiffusespecular_nonemissive_customr";
import { windowsnormaldiffusespecular_gen } from "./generated/windowsnormaldiffusespecular";
import { yellowbarfx_gen } from "./generated/yellowbarfx";
import { zone_death_electricity_gen } from "./generated/zone_death_electricity";
import { zone_death_panel_gen } from "./generated/zone_death_panel";
import { zoneship01_gen } from "./generated/zoneship01";


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.



// Generated from the engine's own shaders by scripts/gen-materials.ts.



// Generated from the engine's own shaders by scripts/gen-materials.ts.



// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.



// Generated from the engine's own shaders by scripts/gen-materials.ts.



// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.

import { EnvSettings } from "@core/formats/rcs/envsettings";

// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.


// Generated from the engine's own shaders by scripts/gen-materials.ts.

// Hand-written: these .rcsmaterial files carry no drawable permutation, so
// the generator has nothing to emit and the approximation still stands.
import { constantcolour } from "./constantcolour";
import { emissivecolourchange } from "./emissivecolourchange";
import { nitro_emissive_outlines } from "./nitro_emissive_outlines";

const FACTORIES: MaterialFactory[] = [
  constantcolour,
  emissivecolourchange,
  nitro_emissive_outlines,
];

/**
 * Factories by the engine's hash of their name, built once.
 *
 * The hash is the identity the format itself uses -- every name in a .rcsmodel
 * or .rcsmaterial is stored as CRC32 of the authored name -- so matching on it
 * matches the way the engine does, and it turns a linear scan run once per
 * material of every model loaded into a single map lookup.
 */
const FACTORIES_BY_HASH = new Map<number, MaterialFactory>(
  FACTORIES.map((factory) => [rcsHash(factory.name), factory])
);

/**
 * Materials running the engine's own shaders, emitted by rcsdump.
 *
 * These override any hand-written factory of the same name: a transcription is
 * a reading of the shader, and this is the shader.
 */
const GENERATED: MaterialFactory[] = [
  m_01_normal_diffuse_specularonalpha_lh_gen,
  m_01_normal_diffuse_specularonalpha_gen,
  m_2diffuse_plus_spec_blend_via_alpha_n_gen,
  m_2rocksandblend_via_diffuse_gen,
  m_2uv_offset_lights_gen,
  aa_defuse_reflect_gen,
  aa_glass_reflect_opacity_normal_gen,
  ab_diff_spec_facing_gen,
  aimi_text_gen,
  alpha_emissive_gen,
  and_anim_spec_gen,
  and_arrowmaterial_gen,
  and_diff_emiss_scale_gen,
  and_diffuse_2nduvfor_alpha_gen,
  and_diffuse_emissive_spec_gen,
  and_diffuse_emissive_gen,
  and_diffuse_vertex_colour_gen,
  and_glass_normscale_gen,
  and_hardlightsnofog1_gen,
  and_rocktosand_gen,
  and_spec_colourcontrol_gen,
  and_spec_power_gen,
  and_tunnelmat_gen,
  and_waterfall_gen,
  animating_traffic_gen,
  animhexlights_gen,
  animlights_gen,
  art2_basic_gen,
  aurora_gen,
  base_diffusealphaemissive_gen,
  base_diffusespecular_gen,
  basicalpha_gen,
  basicnonalpha_gen,
  basic_uv_scroll_gen,
  basic_vertexemissive_gen,
  billboarddiffuse_gen,
  biodome_noalpha_gen,
  biodome_reflect_gen,
  blimphulloneuv_gen,
  blimphull_gen,
  bluemetal_gen,
  carbonfibre_gen,
  cf_321_zone_gen,
  cf_add_point_gen,
  cf_alpha4emissive_gen,
  cf_alpha4glow1_gen,
  cf_alpha4glow_gen,
  cf_anulpha_glow_gen,
  cf_basicvertexalpha_gen,
  cf_billboard1_gen,
  cf_blimplights_anim_gen,
  cf_centre_plasma_pulse_gen,
  cf_cheap_crowd_gen,
  cf_chenghou_sign_2uv_gen,
  cf_chenghou_sign_gen,
  cf_chevron_pulse_gen,
  cf_constantcolourglow_ramp_02_gen,
  cf_constantcolourglow_ramp_03_gen,
  cf_constantcolourglow_ramp_04_gen,
  cf_constantcolourglow_gen,
  cf_diff_spec_gen,
  cf_fetracks_backfacecull_gen,
  cf_fetracks_gen,
  cf_fx350_gen,
  cf_glow_tube_gen,
  cf_icetunnel_gen,
  cf_laserrail_cap_gen,
  cf_laserrail_gen,
  cf_offset_animated_lights_gen,
  cf_plasma_glow2_gen,
  cf_plasma_glow3_gen,
  cf_plasma_glow_gen,
  cf_stadiumad_anim_gen,
  cf_startbeam_glow_gen,
  cf_treetrunk_gen,
  cf_tree_gen,
  cf_uvanim_emssivealpha_gen,
  cf_uvanim_emssive_glowtint_alpha_gen,
  cf_uvanim_emssive_glowtint_gen,
  cf_uvanim_emssive_gen,
  cf_vex_billboard_gen,
  cf_vex_billoard_glow_gen,
  cf_waterfall_gen,
  cf_wingshader_gen,
  chevron_facing_material_gen,
  chevron_pulse_gen,
  clouds_gen,
  cl_tunnelrefraction_gen,
  constantcolour_gen,
  constantdiffuse_specular_normal_gen,
  constantmaterial_gen,
  constantmaterial_vertalpha_gen,
  dc_constantglow_gen,
  dc_diffuseemissive_gen,
  dc_diffusenormalspecular_gen,
  dc_diffusetexturealphaemissive_gen,
  dc_diffusetextureemissiveinalpha_gen,
  dc_diffuse_gen,
  dc_emissivetexture_gen,
  dc_flashingglow_gen,
  dc_flashing_lights_gen,
  dc_glowlightband_gen,
  dc_hologramsigns_gen,
  dc_hologramstars_gen,
  dc_hologramwithstatic2_gen,
  dc_hologramwithstatic_gen,
  dc_lightcone_gen,
  dc_metallic_gen,
  dc_railing_gen,
  d_cs_gen,
  dc_whiteplasticanim_gen,
  dc_whiteplastic_gen,
  dc_windows_a_gen,
  dc_windows_b_opaque_gen,
  dc_windowstest_gen,
  debris_gen,
  defuse_occulsion_vert_col_tint_gen,
  detonator_bomb_explosion_range_gen,
  detonator_bomb_explosion_shockwave_gen,
  detonator_bomb_lightrays_gen,
  detonator_bomb_normal_equalisers_gen,
  detonator_bomb_normal_gen,
  detonator_bomb_rays_plain_gen,
  detonator_bulletgaugesegments_gen,
  detonator_colours_dg_gen,
  detonator_deathshell_gen,
  detonator_diffuse_vcol_gen,
  detonator_diffuse_with_specular_from_alpha_n_vcol_gen,
  detonator_emissive_bloom_gen,
  detonator_leacheffectmat_gen,
  detonator_mine_normal_alpha_gen,
  detonator_shield_plasma1_gen,
  detonator_shield_plasma_gen,
  detonator_shield_gen,
  detonator_ship_dg_iridescent_gen,
  detonator_ship_rich_iridescent_gen,
  dg_zonelights1_gen,
  diffusealfa4opacity_specscalar_gen,
  diffusealpha4spec_scalar_gen,
  diffuse_alpha_gen,
  diffuse_colourtint_diff_spec_facing_gen,
  diffuse_colourtint_seperate_specular_gen,
  diffuse_colourtint_specular_gen,
  diffuse_colourtint_gen,
  diffuse_emissive_alpha_glow_gen,
  diffuse_emissive_alpha_glow_v01_gen,
  diffuseemissivealphaspecular_gen,
  diffuse_emissive_alpha_gen,
  diffuse_emissive_gen,
  diffuse_emissive_with_specular_from_alpha_gen,
  diffuse_normal_specular_emmissive_alpha_gen,
  diffuse_normal_specular_emmissive_gen,
  diffuse_normal_specular_gen,
  diffuse_overlay_gen,
  diffuse_plus_alpha_gen,
  diffuse_reflection_gen,
  diffuse_spec_constant_gen,
  diffuse_spec_fresnel_emissive_gen,
  diffuse_spec_fresnel_gen,
  diffuse_specular_basic_gen,
  diffuse_specular_fresnel_gen,
  diffuse_specular_gen,
  diffuse_specular_v01_gen,
  diffuse_texture_emissivealphascalar_colourtint_gen,
  diffusetextureemissivealphascalar_gen,
  diffusetextureemissivetexture_gen,
  diffuse_gen,
  diffuse_vcol_gen,
  diffusewithalphachannel_gen,
  diffuse_with_specular_and_alpha_gen,
  diffuse_with_specular_from_alpha_n_gen,
  diffuse_with_specular_from_alpha_n_vcol_gen,
  diffuse_with_specular_from_alpha_scalar_gen,
  diffuse_with_specular_from_alpha_gen,
  diffuse_with_specular_from_alpha_vcol_gen,
  diffuse_with_specular_oppos_alpha_gen,
  dn_diffuse_specular_emiss_glow_gen,
  dn_diffuse_specular_emiss_gen,
  dn_diffuse_specular_gen,
  ds_booth_glass_gen,
  ds_diffuse_normal_specular_reflective_gen,
  d_s_n_customr_gen,
  d_s_n_r_gen,
  d_s_n_r_uvflip_gen,
  electricity_gen,
  emissive_alpha_heathaze_noalpha_gen,
  emissive_alpha_heathaze_test_gen,
  emissivealphalights_gen,
  emissive_alpha_pvs_gen,
  emissivealpha_gen,
  emissive_bloom_gen,
  emissive_constant_gen,
  emissive_lights_gen,
  emissivetexture_bright_gen,
  emissivetexture_gen,
  emissive_gen,
  empgauge_rays_gen,
  empgauge_gen,
  etched_glass_amph_gen,
  etched_glass_tech_gen,
  etched_glass_gen,
  explosion_kaleidoscopic_gen,
  fence_alpha_gen,
  flame_test_gen,
  glass_2nduvfor_glow_gen,
  glass_2nduv_glow_gen,
  glass_2nduv_reflect_glow_gen,
  glass_2uv_rgb_reflect_glow_gen,
  glass_2uv_rgb_reflect_normal_glow_gen,
  glassalpha_customr_gen,
  glassalpha_gen,
  glass_colour_spec_trans_gen,
  glass_glow_gen,
  glass_reflect_normal_gen,
  glass_reflect_opacity_normal_gen,
  glass_reflect_opacity_gen,
  glass_reflect_seperateopacity_normal_gen,
  glass_reflect_gen,
  glasstestnoalpha_gen,
  glasstest_gen,
  glass_texture_clamped_gen,
  glass_texture_customr_gen,
  glass_texture_n_gen,
  glass_texture_gen,
  glass_texture_wrecked_gen,
  glow_transparent_overlay_gen,
  gradientcolour1_gen,
  grass_overlay_gen,
  hd_absorbinternal_gen,
  hd_bomb_emissive_gen,
  hd_bombfire_bloomring_gen,
  hd_bombfire_glow_gen,
  hd_bombfire_shockwaves_glow_gen,
  hd_bomb_halo_gen,
  hd_bomb_gen,
  hd_detonator_cannonbolt_halo_gen,
  hd_enginetrail_bluered_gen,
  hd_enginetrail_gen,
  hd_leachbeam_ball_glow_gen,
  hd_leachbeam_bloomring_gen,
  hd_leachbeam_gen,
  hd_mine_beacon_rays_gen,
  hd_mine_beacon_gen,
  hd_mine_halo_gen,
  hd_missile_explosion_core_glow_gen,
  hd_missile_explosion_lightrays_glow_gen,
  hd_missile_explosion_shockwaves_glow_gen,
  hd_muzzleflash_gen,
  hd_plasmahalo_glow_gen,
  hd_plasmaring_glow_gen,
  hd_rocket_surface1_gen,
  hd_rockettrail_shadow_gen,
  hd_rockettrail_gen,
  hd_waketrail_gen,
  hexagonalshield_alpha_gen,
  hexagonalshield_rich_gen,
  hexagonalshield_gen,
  hologram_strip_spec_gen,
  hologram_strip_gen,
  hologram_gen,
  holographic_projector2_gen,
  holographic_test_gen,
  j_alphascalar_gen,
  jd_2uvoverlayspecular_gen,
  jd_2uvoverlay_gen,
  jd_alphalambert_alphatest_gen,
  jd_alphalambert_test_gen,
  jd_alphalambert_gen,
  jd_alphaspecular_gen,
  j_diffuse_colour_tint_spec_gen,
  jd_lambertalpha_gen,
  jd_landinglights_gen,
  jd_simplelambert_gen,
  jd_simplespecular_gen,
  jd_spec2uvoverlay_gen,
  jd_uvanim_emissivealphamultiply_gen,
  j_rgb_colourtintnormalreflect_gen,
  lambert_alpha_02_gen,
  lambert_alpha_v02_gen,
  lambertemissive_gen,
  lambert_simple_gen,
  lambert_spec_mult_emissive_scroll_gen,
  lambert_spec_mult_scroll_gen,
  lambert_spec_mult_gen,
  lambert_spec_reflect_mult_emissive_gen,
  lambert_spec_reflect_mult_gen,
  lambert_gen,
  lambertzeroalpha_gen,
  leacheffectmat_gen,
  lightbarrierframeglow_gen,
  lightbarrierpanel_new_additive_rays_gen,
  lightbarrierpanel_new_additive_gen,
  lightbarrierpanel_new_gen,
  lightbarriershockwave_gen,
  loopmaterial_gen,
  loop_the_loop_caps_gen,
  mageffect08_floor_gen,
  mageffect08_lh_gen,
  mageffect08_gen,
  mag_effect_loop_opaque_gen,
  mageffectloop_gen,
  mageffect_modded_gen,
  mar_diffuse_specular_gen,
  martin_inflatable2_gen,
  martin_inflatable_gen,
  m_diffuse_normal_constantspecular_gen,
  medal_gen,
  mesh_colour_constant_gen,
  metallic_gen,
  mr_2nduvanimdiffuseemissive_gen,
  mr_coloured_specular_gen,
  mr_diffuse_emissive_alpha_glow_specular_gen,
  mr_shopwin_reflecttranspemis_gen,
  mr_stem_gen,
  mr_uvanim_em_alpha_gen,
  mr_uvanim_em_glow_gen,
  mr_waterfall_gen,
  mt_2uv_fresnel_gen,
  mt_additive_glow_outline_gen,
  mt_additive_glow_gen,
  mt_diffuse_alpha_invert_gen,
  mt_diffuse_glow_specular_01_gen,
  mt_diffuse_glow_specular_gen,
  mt_diffuse_specular_gen,
  mt_tunnelrefraction_gen,
  mt_uvanim_diffuse_emissive2_gen,
  mt_uvanim_diffuse_emissive3tokey_gen,
  mt_uvanim_diffuse_emissive3tokey_v_scroll_gen,
  mt_uvanim_diffuse_emissive_gen,
  mt_windows_a_gen,
  mt_windows_c_opaque_gen,
  nitro_body_new_gen,
  nitro_body_gen,
  nitro_emissive_outlines_gen,
  nitrogauge_new_gen,
  nitro_perspex_debris_gen,
  nitro_perspex_new_gen,
  nr_alphatransparentholo_gen,
  nr_billboardholographicscanlines_gen,
  nr_crowd_bustle_gen,
  nr_facinglcdstrips_gen,
  nr_greyscale2colour_gen,
  nr_holobowlparallax_gen,
  nr_lcd_strips_alpha_gen,
  nr_pixellate_gen,
  nr_scalinguvs_gen,
  nr_splitrgbscreen_gen,
  nr_tvarray_02_gen,
  nr_twinblend_gen,
  ns_adbanner_gen,
  orange_glass_gen,
  outerstripeseffect_gen,
  outersurround01_gen,
  pb_diffalphaspecemmisive_jd_gen,
  pb_diffalphaspecnormal_gen,
  pb_diffspecemiss_gen,
  pb_diffusealfa4opacity_specscalar_gen,
  pb_diffusealpha4spec_gen,
  pb_glass_2nduv_reflect_specular1_glow_gen,
  pb_rooftop_das_g_r_gen,
  pb_window_o_gen,
  pb_window_gen,
  pipefx_v2_gen,
  plasmasphere_glow_gen,
  plasmasphere_subtractive_glow_gen,
  pvs_gen,
  reflectplane_dc_seawateredging_gen,
  reflectplane_dc_seawater_gen,
  reticule1_gen,
  reversed_diffuse_specular_normal_gen,
  scanlinebillboard_alphaboost_gen,
  scanlinebillboard_desaturate_gen,
  scanlinebillboard_gen,
  scanlinetext_gen,
  screen_test_gen,
  scroller_glow_v3_gen,
  scroller_glow_v4_gen,
  scrollingalpha_gen,
  sebenco_ice_gen,
  sebenco_snow_just_snow_gen,
  sebenco_snow_gen,
  ship_lod_gen,
  ship_lod_vcol_gen,
  signcl_emissive_glow_gen,
  sign_emissive_alpha_gen,
  sign_emissive_glow2uv_gen,
  sign_emissive_glow_gen,
  sign_emissive_gen,
  simplefogdiffuse_gen,
  simpletextureandtexturealpha_gen,
  simpletextureandtexturealphauvoffsetscale_gen,
  simpletexture_gen,
  simpletextureuvoffsetscale_gen,
  solar_iridescence_reflect_gen,
  sourcerpulse_gen,
  speedup_material_gen,
  standard_diffuse_gen,
  tech_de_ra_cloud_effect_gen,
  tech_de_ra_diffuse_spec_test_gen,
  tech_de_ra_diffuse_spec_gen,
  tech_de_ra_emissive_gen,
  tech_de_ra_rock_floor_gen,
  tech_de_ra_rocks_gen,
  tech_lights_emissive_gen,
  temp_glass_gen,
  temp_testing_mat_colour_spec_alpha_gen,
  temp_testing_mat_diffuse_gen,
  test_gen,
  track_coloured_specular_alpha4glow_gen,
  track_coloured_specular_gen,
  track_surface_no_emissive_gen,
  track_surface_gen,
  tracktexture_with_normal_gen,
  track_wall_gen,
  tunnel_fx_glass_gen,
  tunnel_fx_noalpha_mult_gen,
  tunnel_fx_noalpha_gen,
  uv_anim_diffuse_alpha_emissive_gen,
  uv_anim_diffuse_alpha_gen,
  uvanim_diffuse_emissivealpha_gen,
  uvanim_diffuse_emissive_bloom_gen,
  uvanim_diffuse_emissive_coltint_bloom_gen,
  uvanim_diffuse_emissive_coltint_gen,
  uvanim_diffuse_emissive_gen,
  uvdistortion_diff_vertexcolplusoverlaybloom_gen,
  uvdistortion_diff_vertexcolplusoverlay_gen,
  uvdistortion_diff_vertexcol_gen,
  uv_distortion_gen,
  vertclr_diff_emissive_alpha_glow_gen,
  vertexcolourandtexturealpha_gen,
  vertexcolourandtexture_gen,
  vertxclr_simplespec_gen,
  water_noref_gen,
  water_test_2_gen,
  water_gen,
  weapon_pads_gen,
  wes_billboardholographicscanlines_gen,
  wes_diffuse_colourtint_specular_gen,
  wes_grassvariant_gen,
  windowlight_gen,
  windowsdiffusespecular_nonemissive_customr_gen,
  windowsnormaldiffusespecular_nonemissive_customr_gen,
  windowsnormaldiffusespecular_gen,
  yellowbarfx_gen,
  zone_death_electricity_gen,
  zone_death_panel_gen,
  zoneship01_gen,
];

/** Set false to fall back to the hand-written factories. */
export const USE_GENERATED_MATERIALS = true;

/**
 * Hide every mesh that is NOT running a generated shader.
 *
 * Debug aid from when coverage was partial: with this on, whatever remained
 * visible WAS the generated path, so an artefact was unambiguously ours. Now
 * that the generator covers the materials the tracks actually use, it only
 * hides geometry -- and it hid it for the whole of its life, including the
 * animated meshes, which is why they appeared not to run.
 */
export const ONLY_GENERATED_MATERIALS = false;

if (USE_GENERATED_MATERIALS) {
  for (const factory of GENERATED) FACTORIES_BY_HASH.set(rcsHash(factory.name), factory);
}

/** The material names running generated shaders, for the loader's debug view. */
export const GENERATED_NAMES: ReadonlySet<string> = new Set(GENERATED.map((f) => f.name));

/**
 * Materials already built, keyed by name and the exact textures bound to it.
 *
 * A model names one .rcsmaterial once per USE, not once per file: 01_vineta_k
 * has 805 material entries for 68 distinct files. Building a ShaderMaterial per
 * entry meant 805 GPU shader compiles where 68 would do -- 92% of them
 * redundant, and each one a full GLSL compile and link. Two entries that name
 * the same file AND bind the same textures are interchangeable, so they share
 * one material.
 *
 * The textures are part of the key because the same shader with a different
 * diffuse map is a different material; texture identity is used rather than
 * filename since that is what actually ends up in the uniform.
 */
const materialCache = new Map<string, THREE.Material>();

/**
 * The track's environment settings, once loaded.
 *
 * Materials and the .envsettings file load independently, and the file usually
 * arrives LAST: the console shows the first material built before the settings
 * parse. Pushing the values only to the materials that exist at that moment
 * left every later one -- and every cached one -- on defaults, which is why the
 * ambient and fog fixes appeared to do nothing. Holding them here instead means
 * a material picks them up whenever it is built, in either order.
 */
let currentEnvSettings: EnvSettings | undefined;

/** Called by the loader when a track's .envsettings has parsed. */
export function setEnvSettings(env: EnvSettings) {
  currentEnvSettings = env;
  // Anything already built, including shared instances the cache handed out.
  for (const material of materialCache.values()) {
    const tunable = material as unknown as { applyEnvSettings?: (e: EnvSettings) => void };
    if (typeof tunable.applyEnvSettings === "function") tunable.applyEnvSettings(env);
  }
  // The settings write the same uniforms an override targets, so a manual
  // value has to be re-asserted after them or it is silently reverted.
  for (const m of tunableMaterials()) applyUniformOverrides(m);
}

/** Drop the cache when a model unloads, so its textures can be collected. */
export function clearMaterialCache() {
  materialCache.clear();
}

/**
 * Uniforms the viewer has no real source for, exposed so they can be tried.
 *
 * A generated shader declares uniforms the engine fed from render state we do
 * not model, and `declaredUniforms` invents a neutral for each from its name
 * alone. When a surface comes out tinted, the cause is almost always one of
 * those guesses -- but which one cannot be read off the shader text, and every
 * attempt to derive it has pointed at the wrong term. Being able to drag a
 * value and watch the surface answers it in seconds.
 *
 * An override set here wins over both the neutral and the .envsettings value,
 * and applies to materials built later as well as those already cached.
 */
const uniformOverrides = new Map<string, THREE.Vector4>();

/**
 * What a uniform held before any override touched it.
 *
 * Captured on the first override so "reset" can put the real value back. The
 * override map cannot serve this itself -- once a value is overwritten in the
 * material the original is gone, and reloading the track to undo a slider
 * would make the control useless for comparison.
 */
const uniformDefaults = new Map<string, THREE.Vector4>();

/** Every generated material currently alive, for the override sweep. */
function tunableMaterials() {
  const out: { uniforms: Record<string, THREE.IUniform>; uniformsNeedUpdate: boolean }[] = [];
  for (const material of materialCache.values()) {
    const m = material as unknown as { uniforms?: Record<string, THREE.IUniform>; uniformsNeedUpdate: boolean };
    if (m.uniforms) out.push(m as { uniforms: Record<string, THREE.IUniform>; uniformsNeedUpdate: boolean });
  }
  return out;
}

/** Push one override to every live material that declares that uniform. */
export function setUniformOverride(name: string, value: THREE.Vector4 | null) {
  if (value) {
    // Capture BEFORE the write, and only once: after the first drag every live
    // material holds the overridden value, so a later capture would record the
    // override as the default and reset would restore nothing.
    if (!uniformDefaults.has(name)) {
      const live = liveUniformNames().get(name);
      if (live) uniformDefaults.set(name, live.clone());
    }
    uniformOverrides.set(name, value.clone());
  } else {
    // Restore rather than merely forgetting: the material still holds the
    // overridden value, so dropping the entry alone would change nothing.
    uniformOverrides.delete(name);
    const original = uniformDefaults.get(name);
    if (original) {
      for (const m of tunableMaterials()) {
        const v = m.uniforms[name]?.value as THREE.Vector4 | undefined;
        if (v && typeof v.set === "function") {
          v.set(original.x, original.y, original.z, original.w);
          m.uniformsNeedUpdate = true;
        }
      }
    }
  }
  for (const m of tunableMaterials()) applyUniformOverrides(m);
}

/** Re-apply the whole override set to one material. */
export function applyUniformOverrides(m: { uniforms: Record<string, THREE.IUniform>; uniformsNeedUpdate: boolean }) {
  let touched = false;
  let missed = 0;
  for (const [name, value] of uniformOverrides) {
    const u = m.uniforms[name];
    if (!u) { missed++; continue; }
    const v = u.value as THREE.Vector4 | undefined;
    if (v && typeof v.set === "function") {
      v.set(value.x, value.y, value.z, value.w);
      touched = true;
    }
  }
  if (touched) m.uniformsNeedUpdate = true;
  if (!touched && missed) overrideMisses += missed;
}

/**
 * Overrides that reached no live material, reported once per drag.
 *
 * A slider that appears to do nothing has two very different causes -- the
 * value not reaching the shader, or reaching it and not mattering -- and only
 * the count distinguishes them.
 */
let overrideMisses = 0;

export function reportOverrideReach(name: string) {
  const applied = tunableMaterials().filter((m) => m.uniforms[name]).length;
  console.log(`[override] ${name}: reached ${applied} of ${tunableMaterials().length} live materials`);
  overrideMisses = 0;
}

/** The current override for a uniform, if any. */
export function getUniformOverride(name: string) {
  return uniformOverrides.get(name);
}

/**
 * Every uniform name the live materials declare, with a sample value.
 *
 * The GUI builds its controls from this rather than a hand-kept list: 114
 * distinct names appear across the corpus and which ones are in play depends
 * entirely on which track is loaded.
 */
export function liveUniformNames() {
  const out = new Map<string, THREE.Vector4>();
  for (const m of tunableMaterials()) {
    for (const [name, u] of Object.entries(m.uniforms)) {
      if (out.has(name)) continue;
      if (name.startsWith("TEX") || name.startsWith("viewProj")) continue;
      const v = u.value as THREE.Vector4 | undefined;
      if (v && typeof (v as { isVector4?: boolean }).isVector4 === "boolean" && (v as { isVector4?: boolean }).isVector4) {
        out.set(name, v);
      }
    }
  }
  return out;
}

/**
 * Uniforms something already drives, as opposed to ones we guess at.
 *
 * These are rewritten from a real source -- the camera, the frame clock, the
 * mesh transform, the scene lights, the track's .envsettings -- every frame or
 * every draw. An override on one is pointless AND misleading: tick() puts its
 * own value back on the next frame, so the slider looks inert and reads as
 * "this uniform does nothing", when in fact it was never in question.
 *
 * The genuinely unknown ones are the rest: whatever `declaredUniforms` had to
 * invent a neutral for from its name alone. Those are the ones worth dragging.
 */
export const DRIVEN_UNIFORMS = new Set<string>([
  "eyePositionWorldSpace",
  "time",
  "positionScale",
  "positionBias",
  "directionalLight0Colour",
  "directionalLight0DirectionWorldSpace",
  "constantAmbientColour",
  "fogColour",
]);

export function createMaterial(name: string, textures: THREE.Texture[], channelIds?: number[], streams?: Set<number>) {
  const factory = FACTORIES_BY_HASH.get(rcsHash(name));

  const key = `${name}|${textures.map((t) => (t ? t.uuid : "-")).join(",")}|${(channelIds ?? []).join(",")}|${streams ? [...streams].sort().join(",") : ""}`;
  const cached = materialCache.get(key);
  if (cached) return cached;

  if (factory) {
    // Texture channels can contain gaps (slots with no file), so count real
    // textures rather than array length.
    const present = textures.filter((t) => t).length;
    if (present < factory.minTextures) {
      console.warn(`Wrong number of textures for '${name}' (${present} present, expected at least ${factory.minTextures})`);
    }
    if (present > factory.maxTextures) {
      console.warn(`Wrong number of textures for '${name}' (${present} present, expected at most ${factory.maxTextures})`);
    }
    let material: THREE.Material | null = null;
    try {
      if (factory.makeById && channelIds) {
        const byId = new Map<number, THREE.Texture>();
        for (let i = 0; i < textures.length; i++) {
          if (textures[i]) byId.set(channelIds[i], textures[i]);
        }
        material = factory.makeById(byId, streams);
      } else {
        material = factory.make(textures);
      }
    } catch (e) {
      // Report and fall back -- do NOT rethrow.
      //
      // createMaterial runs from AsyncMaterial.finish(), which is called from
      // the texture-load callback. A throw there escapes into the loader's own
      // loop and abandons every material still queued behind it, so ONE bad
      // material leaves the whole model unbuilt. That is not a hypothetical:
      // rethrowing here is what made the entire scene vanish when the generated
      // factories were switched on, even though only 37 of 3007 meshes use one.
      //
      // The failure still has to be visible -- a silent fallback is how a
      // composition bug hides -- so it is named here and the mesh gets the
      // default material rather than none.
      console.error(`[mat] building '${name}' failed; using fallback:`, e);
    }
    if (material) {
      material.name = name;
      // Whatever the load order, a material is born with the track's values.
      if (currentEnvSettings) {
        const tunable = material as unknown as { applyEnvSettings?: (e: EnvSettings) => void };
        if (typeof tunable.applyEnvSettings === "function") tunable.applyEnvSettings(currentEnvSettings);
      }
      // After the settings, so a manual value is not overwritten by them.
      const tunableUniforms = material as unknown as { uniforms?: Record<string, THREE.IUniform>; uniformsNeedUpdate: boolean };
      if (tunableUniforms.uniforms) {
        applyUniformOverrides(tunableUniforms as { uniforms: Record<string, THREE.IUniform>; uniformsNeedUpdate: boolean });
      }
      materialCache.set(key, material);
      return material;
    }
  }

  console.warn(`Unsupported material: ${name} ${textures}`);
  const fallback = new THREE.MeshStandardMaterial({
    name,
    side: THREE.DoubleSide,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.0,
    ...(textures.length > 0 && textures[0] ? { map: textures[0] } : {}),
  });
  materialCache.set(key, fallback);
  return fallback;
}

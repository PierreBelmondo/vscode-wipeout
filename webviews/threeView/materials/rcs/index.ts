import * as THREE from "three";

import { rcsHash } from "@core/formats/rcs/ids";
import { MaterialFactory } from "./_abstract";

import { aa_defuse_reflect } from "./aa_defuse_reflect";
import { aa_glass_reflect_opacity_normal } from "./aa_glass_reflect_opacity_normal";
import { ab_diff_spec_facing } from "./ab_diff_spec_facing";
import { aimi_text } from "./aimi_text";
import { alpha_emissive } from "./alpha_emissive";
import { and_anim_spec } from "./and_anim_spec";
import { and_arrowmaterial } from "./and_arrowmaterial";
import { and_diff_emiss_scale } from "./and_diff_emiss_scale";
import { and_diffuse_2nduvfor_alpha } from "./and_diffuse_2nduvfor_alpha";
import { and_diffuse_emissive } from "./and_diffuse_emissive";
import { and_diffuse_emissive_spec } from "./and_diffuse_emissive_spec";
import { and_diffuse_vertex_colour } from "./and_diffuse_vertex_colour";
import { and_glass_normscale } from "./and_glass_normscale";
import { and_hardlightsnofog1 } from "./and_hardlightsnofog1";
import { and_rocktosand } from "./and_rocktosand";
import { and_spec_colourcontrol } from "./and_spec_colourcontrol";
import { and_spec_power } from "./and_spec_power";
import { and_tunnelmat } from "./and_tunnelmat";
import { and_waterfall } from "./and_waterfall";
import { animating_traffic } from "./animating_traffic";
import { animhexlights } from "./animhexlights";
import { animlights } from "./animlights";
import { art2_basic } from "./art2_basic";
import { base_diffusealphaemissive } from "./base_diffusealphaemissive";
import { base_diffusespecular } from "./base_diffusespecular";
import { basic_uv_scroll } from "./basic_uv_scroll";
import { basic_vertexemissive } from "./basic_vertexemissive";
import { basicalpha } from "./basicalpha";
import { billboarddiffuse } from "./billboarddiffuse";
import { biodome_noalpha } from "./biodome_noalpha";
import { biodome_reflect } from "./biodome_reflect";
import { blimphull } from "./blimphull";
import { blimphulloneuv } from "./blimphulloneuv";
import { bluemetal } from "./bluemetal";
import { carbonfibre } from "./carbonfibre";
import { cf_add_point } from "./cf_add_point";
import { cf_alpha4emissive } from "./cf_alpha4emissive";
import { cf_alpha4glow } from "./cf_alpha4glow";
import { cf_alpha4glow1 } from "./cf_alpha4glow1";
import { cf_anulpha_glow } from "./cf_anulpha_glow";
import { cf_billboard1 } from "./cf_billboard1";
import { cf_blimplights_anim } from "./cf_blimplights_anim";
import { cf_centre_plasma_pulse } from "./cf_centre_plasma_pulse";
import { cf_cheap_crowd } from "./cf_cheap_crowd";
import { cf_chenghou_sign } from "./cf_chenghou_sign";
import { cf_chenghou_sign_2uv } from "./cf_chenghou_sign_2uv";
import { cf_chevron_pulse } from "./cf_chevron_pulse";
import { cf_constantcolourglow } from "./cf_constantcolourglow";
import { cf_constantcolourglow_ramp_02 } from "./cf_constantcolourglow_ramp_02";
import { cf_constantcolourglow_ramp_03 } from "./cf_constantcolourglow_ramp_03";
import { cf_constantcolourglow_ramp_04 } from "./cf_constantcolourglow_ramp_04";
import { cf_diff_spec } from "./cf_diff_spec";
import { cf_glow_tube } from "./cf_glow_tube";
import { cf_icetunnel } from "./cf_icetunnel";
import { cf_laserrail } from "./cf_laserrail";
import { cf_laserrail_cap } from "./cf_laserrail_cap";
import { cf_offset_animated_lights } from "./cf_offset_animated_lights";
import { cf_plasma_glow } from "./cf_plasma_glow";
import { cf_plasma_glow2 } from "./cf_plasma_glow2";
import { cf_plasma_glow3 } from "./cf_plasma_glow3";
import { cf_stadiumad_anim } from "./cf_stadiumad_anim";
import { cf_startbeam_glow } from "./cf_startbeam_glow";
import { cf_tree } from "./cf_tree";
import { cf_treetrunk } from "./cf_treetrunk";
import { cf_uvanim_emssive } from "./cf_uvanim_emssive";
import { cf_uvanim_emssive_glowtint } from "./cf_uvanim_emssive_glowtint";
import { cf_uvanim_emssive_glowtint_alpha } from "./cf_uvanim_emssive_glowtint_alpha";
import { cf_uvanim_emssivealpha } from "./cf_uvanim_emssivealpha";
import { cf_vex_billboard } from "./cf_vex_billboard";
import { cf_vex_billoard_glow } from "./cf_vex_billoard_glow";
import { cf_waterfall } from "./cf_waterfall";
import { cf_wingshader } from "./cf_wingshader";
import { chevron_facing_material } from "./chevron_facing_material";
import { chevron_pulse } from "./chevron_pulse";
import { cl_tunnelrefraction } from "./cl_tunnelrefraction";
import { clouds } from "./clouds";
import { constantcolour } from "./constantcolour";
import { constantdiffuse_specular_normal } from "./constantdiffuse_specular_normal";
import { constantmaterial } from "./constantmaterial";
import { constantmaterial_vertalpha } from "./constantmaterial_vertalpha";
import { d_cs } from "./d_cs";
import { d_s_n_customr } from "./d_s_n_customr";
import { d_s_n_r } from "./d_s_n_r";
import { d_s_n_r_uvflip } from "./d_s_n_r_uvflip";
import { dc_constantglow } from "./dc_constantglow";
import { dc_diffuse } from "./dc_diffuse";
import { dc_diffuseemissive } from "./dc_diffuseemissive";
import { dc_diffusenormalspecular } from "./dc_diffusenormalspecular";
import { dc_diffusetexturealphaemissive } from "./dc_diffusetexturealphaemissive";
import { dc_diffusetextureemissiveinalpha } from "./dc_diffusetextureemissiveinalpha";
import { dc_emissivetexture } from "./dc_emissivetexture";
import { dc_flashing_lights } from "./dc_flashing_lights";
import { dc_flashingglow } from "./dc_flashingglow";
import { dc_glowlightband } from "./dc_glowlightband";
import { dc_hologramsigns } from "./dc_hologramsigns";
import { dc_hologramstars } from "./dc_hologramstars";
import { dc_hologramwithstatic } from "./dc_hologramwithstatic";
import { dc_hologramwithstatic2 } from "./dc_hologramwithstatic2";
import { dc_lightcone } from "./dc_lightcone";
import { dc_metallic } from "./dc_metallic";
import { dc_railing } from "./dc_railing";
import { dc_whiteplastic } from "./dc_whiteplastic";
import { dc_whiteplasticanim } from "./dc_whiteplasticanim";
import { dc_windows_a } from "./dc_windows_a";
import { dc_windows_b_opaque } from "./dc_windows_b_opaque";
import { dc_windowstest } from "./dc_windowstest";
import { debris } from "./debris";
import { defuse_occulsion_vert_col_tint } from "./defuse_occulsion_vert_col_tint";
import { detonator_diffuse_vcol } from "./detonator_diffuse_vcol";
import { detonator_diffuse_with_specular_from_alpha_n_vcol } from "./detonator_diffuse_with_specular_from_alpha_n_vcol";
import { detonator_emissive_bloom } from "./detonator_emissive_bloom";
import { diffuse } from "./diffuse";
import { diffuse_alpha } from "./diffuse_alpha";
import { diffuse_colourtint } from "./diffuse_colourtint";
import { diffuse_colourtint_diff_spec_facing } from "./diffuse_colourtint_diff_spec_facing";
import { diffuse_colourtint_seperate_specular } from "./diffuse_colourtint_seperate_specular";
import { diffuse_colourtint_specular } from "./diffuse_colourtint_specular";
import { diffuse_emissive } from "./diffuse_emissive";
import { diffuse_emissive_alpha } from "./diffuse_emissive_alpha";
import { diffuse_emissive_alpha_glow } from "./diffuse_emissive_alpha_glow";
import { diffuse_emissive_alpha_glow_v01 } from "./diffuse_emissive_alpha_glow_v01";
import { diffuse_emissive_with_specular_from_alpha } from "./diffuse_emissive_with_specular_from_alpha";
import { diffuse_normal_specular } from "./diffuse_normal_specular";
import { diffuse_normal_specular_emmissive } from "./diffuse_normal_specular_emmissive";
import { diffuse_normal_specular_emmissive_alpha } from "./diffuse_normal_specular_emmissive_alpha";
import { diffuse_overlay } from "./diffuse_overlay";
import { diffuse_plus_alpha } from "./diffuse_plus_alpha";
import { diffuse_reflection } from "./diffuse_reflection";
import { diffuse_spec_constant } from "./diffuse_spec_constant";
import { diffuse_spec_fresnel } from "./diffuse_spec_fresnel";
import { diffuse_spec_fresnel_emissive } from "./diffuse_spec_fresnel_emissive";
import { diffuse_specular } from "./diffuse_specular";
import { diffuse_specular_basic } from "./diffuse_specular_basic";
import { diffuse_specular_fresnel } from "./diffuse_specular_fresnel";
import { diffuse_specular_v01 } from "./diffuse_specular_v01";
import { diffuse_texture_emissivealphascalar_colourtint } from "./diffuse_texture_emissivealphascalar_colourtint";
import { diffuse_vcol } from "./diffuse_vcol";
import { diffuse_with_specular_and_alpha } from "./diffuse_with_specular_and_alpha";
import { diffuse_with_specular_from_alpha } from "./diffuse_with_specular_from_alpha";
import { diffuse_with_specular_from_alpha_n } from "./diffuse_with_specular_from_alpha_n";
import { diffuse_with_specular_from_alpha_n_vcol } from "./diffuse_with_specular_from_alpha_n_vcol";
import { diffuse_with_specular_from_alpha_scalar } from "./diffuse_with_specular_from_alpha_scalar";
import { diffuse_with_specular_from_alpha_vcol } from "./diffuse_with_specular_from_alpha_vcol";
import { diffuse_with_specular_oppos_alpha } from "./diffuse_with_specular_oppos_alpha";
import { diffusealfa4opacity_specscalar } from "./diffusealfa4opacity_specscalar";
import { diffusealpha4spec_scalar } from "./diffusealpha4spec_scalar";
import { diffuseemissivealphaspecular } from "./diffuseemissivealphaspecular";
import { diffusetextureemissivealphascalar } from "./diffusetextureemissivealphascalar";
import { diffusetextureemissivetexture } from "./diffusetextureemissivetexture";
import { diffusewithalphachannel } from "./diffusewithalphachannel";
import { dn_diffuse_specular } from "./dn_diffuse_specular";
import { dn_diffuse_specular_emiss } from "./dn_diffuse_specular_emiss";
import { dn_diffuse_specular_emiss_glow } from "./dn_diffuse_specular_emiss_glow";
import { ds_booth_glass } from "./ds_booth_glass";
import { ds_diffuse_normal_specular_reflective } from "./ds_diffuse_normal_specular_reflective";
import { emissive } from "./emissive";
import { emissive_alpha_heathaze_noalpha } from "./emissive_alpha_heathaze_noalpha";
import { emissive_alpha_heathaze_test } from "./emissive_alpha_heathaze_test";
import { emissive_bloom } from "./emissive_bloom";
import { emissive_lights } from "./emissive_lights";
import { emissivealphalights } from "./emissivealphalights";
import { emissivecolourchange } from "./emissivecolourchange";
import { emissivetexture } from "./emissivetexture";
import { emissivetexture_bright } from "./emissivetexture_bright";
import { etched_glass } from "./etched_glass";
import { etched_glass_amph } from "./etched_glass_amph";
import { etched_glass_tech } from "./etched_glass_tech";
import { fence_alpha } from "./fence_alpha";
import { flame_test } from "./flame_test";
import { glass_2nduv_glow } from "./glass_2nduv_glow";
import { glass_2nduv_reflect_glow } from "./glass_2nduv_reflect_glow";
import { glass_2nduvfor_glow } from "./glass_2nduvfor_glow";
import { glass_2uv_rgb_reflect_glow } from "./glass_2uv_rgb_reflect_glow";
import { glass_2uv_rgb_reflect_normal_glow } from "./glass_2uv_rgb_reflect_normal_glow";
import { glass_colour_spec_trans } from "./glass_colour_spec_trans";
import { glass_glow } from "./glass_glow";
import { glass_reflect } from "./glass_reflect";
import { glass_reflect_normal } from "./glass_reflect_normal";
import { glass_reflect_opacity } from "./glass_reflect_opacity";
import { glass_reflect_opacity_normal } from "./glass_reflect_opacity_normal";
import { glass_reflect_seperateopacity_normal } from "./glass_reflect_seperateopacity_normal";
import { glass_texture } from "./glass_texture";
import { glass_texture_clamped } from "./glass_texture_clamped";
import { glass_texture_customr } from "./glass_texture_customr";
import { glass_texture_n } from "./glass_texture_n";
import { glass_texture_wrecked } from "./glass_texture_wrecked";
import { glassalpha } from "./glassalpha";
import { glassalpha_customr } from "./glassalpha_customr";
import { glasstest } from "./glasstest";
import { glasstestnoalpha } from "./glasstestnoalpha";
import { glow_transparent_overlay } from "./glow_transparent_overlay";
import { gradientcolour1 } from "./gradientcolour1";
import { grass_overlay } from "./grass_overlay";
import { hd_bomb } from "./hd_bomb";
import { hexagonalshield_alpha } from "./hexagonalshield_alpha";
import { hexagonalshield_rich } from "./hexagonalshield_rich";
import { hologram } from "./hologram";
import { hologram_strip } from "./hologram_strip";
import { hologram_strip_spec } from "./hologram_strip_spec";
import { holographic_projector2 } from "./holographic_projector2";
import { holographic_test } from "./holographic_test";
import { j_alphascalar } from "./j_alphascalar";
import { j_diffuse_colour_tint_spec } from "./j_diffuse_colour_tint_spec";
import { j_rgb_colourtintnormalreflect } from "./j_rgb_colourtintnormalreflect";
import { jd_2uvoverlay } from "./jd_2uvoverlay";
import { jd_2uvoverlayspecular } from "./jd_2uvoverlayspecular";
import { jd_alphalambert } from "./jd_alphalambert";
import { jd_alphalambert_alphatest } from "./jd_alphalambert_alphatest";
import { jd_alphalambert_test } from "./jd_alphalambert_test";
import { jd_alphaspecular } from "./jd_alphaspecular";
import { jd_lambertalpha } from "./jd_lambertalpha";
import { jd_landinglights } from "./jd_landinglights";
import { jd_simplelambert } from "./jd_simplelambert";
import { jd_simplespecular } from "./jd_simplespecular";
import { jd_spec2uvoverlay } from "./jd_spec2uvoverlay";
import { jd_uvanim_emissivealphamultiply } from "./jd_uvanim_emissivealphamultiply";
import { lambert } from "./lambert";
import { lambert_alpha_02 } from "./lambert_alpha_02";
import { lambert_alpha_v02 } from "./lambert_alpha_v02";
import { lambert_simple } from "./lambert_simple";
import { lambert_spec_mult } from "./lambert_spec_mult";
import { lambert_spec_mult_emissive_scroll } from "./lambert_spec_mult_emissive_scroll";
import { lambert_spec_mult_scroll } from "./lambert_spec_mult_scroll";
import { lambert_spec_reflect_mult } from "./lambert_spec_reflect_mult";
import { lambert_spec_reflect_mult_emissive } from "./lambert_spec_reflect_mult_emissive";
import { lambertemissive } from "./lambertemissive";
import { lambertzeroalpha } from "./lambertzeroalpha";
import { lightbarrierframeglow } from "./lightbarrierframeglow";
import { lightbarrierpanel_new_additive } from "./lightbarrierpanel_new_additive";
import { loop_the_loop_caps } from "./loop_the_loop_caps";
import { loopmaterial } from "./loopmaterial";
import { m_01_normal_diffuse_specularonalpha } from "./m_01_normal_diffuse_specularonalpha";
import { m_2diffuse_plus_spec_blend_via_alpha_n } from "./m_2diffuse_plus_spec_blend_via_alpha_n";
import { m_2uv_offset_lights } from "./m_2uv_offset_lights";
import { m_diffuse_normal_constantspecular } from "./m_diffuse_normal_constantspecular";
import { mag_effect_loop_opaque } from "./mag_effect_loop_opaque";
import { mageffect08 } from "./mageffect08";
import { mageffect08_floor } from "./mageffect08_floor";
import { mageffect08_lh } from "./mageffect08_lh";
import { mageffect_modded } from "./mageffect_modded";
import { mageffectloop } from "./mageffectloop";
import { mar_diffuse_specular } from "./mar_diffuse_specular";
import { martin_inflatable } from "./martin_inflatable";
import { martin_inflatable2 } from "./martin_inflatable2";
import { medal } from "./medal";
import { mesh_colour_constant } from "./mesh_colour_constant";
import { metallic } from "./metallic";
import { mr_2nduvanimdiffuseemissive } from "./mr_2nduvanimdiffuseemissive";
import { mr_coloured_specular } from "./mr_coloured_specular";
import { mr_diffuse_emissive_alpha_glow_specular } from "./mr_diffuse_emissive_alpha_glow_specular";
import { mr_shopwin_reflecttranspemis } from "./mr_shopwin_reflecttranspemis";
import { mr_stem } from "./mr_stem";
import { mr_uvanim_em_alpha } from "./mr_uvanim_em_alpha";
import { mr_uvanim_em_glow } from "./mr_uvanim_em_glow";
import { mr_waterfall } from "./mr_waterfall";
import { mt_2uv_fresnel } from "./mt_2uv_fresnel";
import { mt_additive_glow } from "./mt_additive_glow";
import { mt_additive_glow_outline } from "./mt_additive_glow_outline";
import { mt_diffuse_alpha_invert } from "./mt_diffuse_alpha_invert";
import { mt_diffuse_glow_specular } from "./mt_diffuse_glow_specular";
import { mt_diffuse_glow_specular_01 } from "./mt_diffuse_glow_specular_01";
import { mt_diffuse_specular } from "./mt_diffuse_specular";
import { mt_tunnelrefraction } from "./mt_tunnelrefraction";
import { mt_uvanim_diffuse_emissive } from "./mt_uvanim_diffuse_emissive";
import { mt_uvanim_diffuse_emissive2 } from "./mt_uvanim_diffuse_emissive2";
import { mt_uvanim_diffuse_emissive3tokey } from "./mt_uvanim_diffuse_emissive3tokey";
import { mt_uvanim_diffuse_emissive3tokey_v_scroll } from "./mt_uvanim_diffuse_emissive3tokey_v_scroll";
import { mt_windows_a } from "./mt_windows_a";
import { mt_windows_c_opaque } from "./mt_windows_c_opaque";
import { nitro_body_new } from "./nitro_body_new";
import { nitro_emissive_outlines } from "./nitro_emissive_outlines";
import { nitro_perspex_new } from "./nitro_perspex_new";
import { nr_alphatransparentholo } from "./nr_alphatransparentholo";
import { nr_billboardholographicscanlines } from "./nr_billboardholographicscanlines";
import { nr_crowd_bustle } from "./nr_crowd_bustle";
import { nr_facinglcdstrips } from "./nr_facinglcdstrips";
import { nr_greyscale2colour } from "./nr_greyscale2colour";
import { nr_holobowlparallax } from "./nr_holobowlparallax";
import { nr_lcd_strips_alpha } from "./nr_lcd_strips_alpha";
import { nr_pixellate } from "./nr_pixellate";
import { nr_scalinguvs } from "./nr_scalinguvs";
import { nr_splitrgbscreen } from "./nr_splitrgbscreen";
import { nr_tvarray_02 } from "./nr_tvarray_02";
import { nr_twinblend } from "./nr_twinblend";
import { ns_adbanner } from "./ns_adbanner";
import { orange_glass } from "./orange_glass";
import { outerstripeseffect } from "./outerstripeseffect";
import { outersurround01 } from "./outersurround01";
import { pb_diffalphaspecemmisive_jd } from "./pb_diffalphaspecemmisive_jd";
import { pb_diffalphaspecnormal } from "./pb_diffalphaspecnormal";
import { pb_diffspecemiss } from "./pb_diffspecemiss";
import { pb_diffusealfa4opacity_specscalar } from "./pb_diffusealfa4opacity_specscalar";
import { pb_diffusealpha4spec } from "./pb_diffusealpha4spec";
import { pb_glass_2nduv_reflect_specular1_glow } from "./pb_glass_2nduv_reflect_specular1_glow";
import { pb_rooftop_das_g_r } from "./pb_rooftop_das_g_r";
import { pb_window } from "./pb_window";
import { pb_window_o } from "./pb_window_o";
import { pipefx_v2 } from "./pipefx_v2";
import { reflectplane_dc_seawater } from "./reflectplane_dc_seawater";
import { reflectplane_dc_seawateredging } from "./reflectplane_dc_seawateredging";
import { reversed_diffuse_specular_normal } from "./reversed_diffuse_specular_normal";
import { rocksandblend_via_diffuse_2 } from "./2rocksandblend_via_diffuse";
import { scanlinebillboard } from "./scanlinebillboard";
import { scanlinebillboard_alphaboost } from "./scanlinebillboard_alphaboost";
import { scanlinebillboard_desaturate } from "./scanlinebillboard_desaturate";
import { scanlinetext } from "./scanlinetext";
import { scroller_glow_v3 } from "./scroller_glow_v3";
import { scroller_glow_v4 } from "./scroller_glow_v4";
import { sebenco_ice } from "./sebenco_ice";
import { sebenco_snow } from "./sebenco_snow";
import { sebenco_snow_just_snow } from "./sebenco_snow_just_snow";
import { ship_lod_vcol } from "./ship_lod_vcol";
import { sign_emissive } from "./sign_emissive";
import { sign_emissive_alpha } from "./sign_emissive_alpha";
import { sign_emissive_glow } from "./sign_emissive_glow";
import { sign_emissive_glow2uv } from "./sign_emissive_glow2uv";
import { signcl_emissive_glow } from "./signcl_emissive_glow";
import { simplefogdiffuse } from "./simplefogdiffuse";
import { simpletexture } from "./simpletexture";
import { simpletextureandtexturealpha } from "./simpletextureandtexturealpha";
import { simpletextureandtexturealphauvoffsetscale } from "./simpletextureandtexturealphauvoffsetscale";
import { simpletextureuvoffsetscale } from "./simpletextureuvoffsetscale";
import { solar_iridescence_reflect } from "./solar_iridescence_reflect";
import { sourcerpulse } from "./sourcerpulse";
import { speedup_material } from "./speedup_material";
import { standard_diffuse } from "./standard_diffuse";
import { tech_de_ra_cloud_effect } from "./tech_de_ra_cloud_effect";
import { tech_de_ra_diffuse_spec } from "./tech_de_ra_diffuse_spec";
import { tech_de_ra_diffuse_spec_test } from "./tech_de_ra_diffuse_spec_test";
import { tech_de_ra_emissive } from "./tech_de_ra_emissive";
import { tech_de_ra_rock_floor } from "./tech_de_ra_rock_floor";
import { tech_de_ra_rocks } from "./tech_de_ra_rocks";
import { tech_lights_emissive } from "./tech_lights_emissive";
import { temp_glass } from "./temp_glass";
import { temp_testing_mat_colour_spec_alpha } from "./temp_testing_mat_colour_spec_alpha";
import { temp_testing_mat_diffuse } from "./temp_testing_mat_diffuse";
import { test } from "./test";
import { track_coloured_specular } from "./track_coloured_specular";
import { track_coloured_specular_alpha4glow } from "./track_coloured_specular_alpha4glow";
import { track_surface } from "./track_surface";
import { track_surface_no_emissive } from "./track_surface_no_emissive";
import { track_wall } from "./track_wall";
import { tracktexture_with_normal } from "./tracktexture_with_normal";
import { tunnel_fx_glass } from "./tunnel_fx_glass";
import { tunnel_fx_noalpha } from "./tunnel_fx_noalpha";
import { tunnel_fx_noalpha_mult } from "./tunnel_fx_noalpha_mult";
import { uv_anim_diffuse_alpha } from "./uv_anim_diffuse_alpha";
import { uv_anim_diffuse_alpha_emissive } from "./uv_anim_diffuse_alpha_emissive";
import { uv_distortion } from "./uv_distortion";
import { uvanim_diffuse_emissive } from "./uvanim_diffuse_emissive";
import { uvanim_diffuse_emissive_bloom } from "./uvanim_diffuse_emissive_bloom";
import { uvanim_diffuse_emissive_coltint } from "./uvanim_diffuse_emissive_coltint";
import { uvanim_diffuse_emissive_coltint_bloom } from "./uvanim_diffuse_emissive_coltint_bloom";
import { uvanim_diffuse_emissivealpha } from "./uvanim_diffuse_emissivealpha";
import { uvdistortion_diff_vertexcol } from "./uvdistortion_diff_vertexcol";
import { uvdistortion_diff_vertexcolplusoverlay } from "./uvdistortion_diff_vertexcolplusoverlay";
import { uvdistortion_diff_vertexcolplusoverlaybloom } from "./uvdistortion_diff_vertexcolplusoverlaybloom";
import { vertclr_diff_emissive_alpha_glow } from "./vertclr_diff_emissive_alpha_glow";
import { vertxclr_simplespec } from "./vertxclr_simplespec";
import { water } from "./water";
import { water_noref } from "./water_noref";
import { water_test_2 } from "./water_test_2";
import { weapon_pads } from "./weapon_pads";
import { wes_billboardholographicscanlines } from "./wes_billboardholographicscanlines";
import { wes_diffuse_colourtint_specular } from "./wes_diffuse_colourtint_specular";
import { wes_grassvariant } from "./wes_grassvariant";
import { windowlight } from "./windowlight";
import { windowsdiffusespecular_nonemissive_customr } from "./windowsdiffusespecular_nonemissive_customr";
import { windowsnormaldiffusespecular } from "./windowsnormaldiffusespecular";
import { windowsnormaldiffusespecular_nonemissive_customr } from "./windowsnormaldiffusespecular_nonemissive_customr";
import { yellowbarfx } from "./yellowbarfx";

// WipEout 2048 (PSVita)
import { engine_additive_2048 } from "./2048/engine_additive";
import { ship_glass_dg_2048 } from "./2048/ship_glass_dg";
import { ship_lights_2048 } from "./2048/ship_lights";
import { ship_paint_shiny_final_2048 } from "./2048/ship_paint_shiny_final";
import { ship_tech_2048 } from "./2048/ship_tech";

const FACTORIES = [
  aa_defuse_reflect,
  aa_glass_reflect_opacity_normal,
  ab_diff_spec_facing,
  aimi_text,
  alpha_emissive,
  and_anim_spec,
  and_arrowmaterial,
  and_diff_emiss_scale,
  and_diffuse_2nduvfor_alpha,
  and_diffuse_emissive,
  and_diffuse_emissive_spec,
  and_diffuse_vertex_colour,
  and_glass_normscale,
  and_hardlightsnofog1,
  and_rocktosand,
  and_spec_colourcontrol,
  and_spec_power,
  and_tunnelmat,
  and_waterfall,
  animating_traffic,
  animhexlights,
  animlights,
  art2_basic,
  base_diffusealphaemissive,
  base_diffusespecular,
  basic_uv_scroll,
  basic_vertexemissive,
  basicalpha,
  billboarddiffuse,
  biodome_noalpha,
  biodome_reflect,
  blimphull,
  blimphulloneuv,
  bluemetal,
  carbonfibre,
  cf_add_point,
  cf_alpha4emissive,
  cf_alpha4glow,
  cf_alpha4glow1,
  cf_anulpha_glow,
  cf_billboard1,
  cf_blimplights_anim,
  cf_centre_plasma_pulse,
  cf_cheap_crowd,
  cf_chenghou_sign,
  cf_chenghou_sign_2uv,
  cf_chevron_pulse,
  cf_constantcolourglow,
  cf_constantcolourglow_ramp_02,
  cf_constantcolourglow_ramp_03,
  cf_constantcolourglow_ramp_04,
  cf_diff_spec,
  cf_glow_tube,
  cf_icetunnel,
  cf_laserrail,
  cf_laserrail_cap,
  cf_offset_animated_lights,
  cf_plasma_glow,
  cf_plasma_glow2,
  cf_plasma_glow3,
  cf_stadiumad_anim,
  cf_startbeam_glow,
  cf_tree,
  cf_treetrunk,
  cf_uvanim_emssive,
  cf_uvanim_emssive_glowtint,
  cf_uvanim_emssive_glowtint_alpha,
  cf_uvanim_emssivealpha,
  cf_vex_billboard,
  cf_vex_billoard_glow,
  cf_waterfall,
  cf_wingshader,
  chevron_facing_material,
  chevron_pulse,
  cl_tunnelrefraction,
  clouds,
  constantcolour,
  constantdiffuse_specular_normal,
  constantmaterial,
  constantmaterial_vertalpha,
  d_cs,
  d_s_n_customr,
  d_s_n_r,
  d_s_n_r_uvflip,
  dc_constantglow,
  dc_diffuse,
  dc_diffuseemissive,
  dc_diffusenormalspecular,
  dc_diffusetexturealphaemissive,
  dc_diffusetextureemissiveinalpha,
  dc_emissivetexture,
  dc_flashing_lights,
  dc_flashingglow,
  dc_glowlightband,
  dc_hologramsigns,
  dc_hologramstars,
  dc_hologramwithstatic,
  dc_hologramwithstatic2,
  dc_lightcone,
  dc_metallic,
  dc_railing,
  dc_whiteplastic,
  dc_whiteplasticanim,
  dc_windows_a,
  dc_windows_b_opaque,
  dc_windowstest,
  debris,
  defuse_occulsion_vert_col_tint,
  detonator_diffuse_vcol,
  detonator_diffuse_with_specular_from_alpha_n_vcol,
  detonator_emissive_bloom,
  diffuse,
  diffuse_alpha,
  diffuse_colourtint,
  diffuse_colourtint_diff_spec_facing,
  diffuse_colourtint_seperate_specular,
  diffuse_colourtint_specular,
  diffuse_emissive,
  diffuse_emissive_alpha,
  diffuse_emissive_alpha_glow,
  diffuse_emissive_alpha_glow_v01,
  diffuse_emissive_with_specular_from_alpha,
  diffuse_normal_specular,
  diffuse_normal_specular_emmissive,
  diffuse_normal_specular_emmissive_alpha,
  diffuse_overlay,
  diffuse_plus_alpha,
  diffuse_reflection,
  diffuse_spec_constant,
  diffuse_spec_fresnel,
  diffuse_spec_fresnel_emissive,
  diffuse_specular,
  diffuse_specular_basic,
  diffuse_specular_fresnel,
  diffuse_specular_v01,
  diffuse_texture_emissivealphascalar_colourtint,
  diffuse_vcol,
  diffuse_with_specular_and_alpha,
  diffuse_with_specular_from_alpha,
  diffuse_with_specular_from_alpha_n,
  diffuse_with_specular_from_alpha_n_vcol,
  diffuse_with_specular_from_alpha_scalar,
  diffuse_with_specular_from_alpha_vcol,
  diffuse_with_specular_oppos_alpha,
  diffusealfa4opacity_specscalar,
  diffusealpha4spec_scalar,
  diffuseemissivealphaspecular,
  diffusetextureemissivealphascalar,
  diffusetextureemissivetexture,
  diffusewithalphachannel,
  dn_diffuse_specular,
  dn_diffuse_specular_emiss,
  dn_diffuse_specular_emiss_glow,
  ds_booth_glass,
  ds_diffuse_normal_specular_reflective,
  emissive,
  emissive_alpha_heathaze_noalpha,
  emissive_alpha_heathaze_test,
  emissive_bloom,
  emissive_lights,
  emissivealphalights,
  emissivecolourchange,
  emissivetexture,
  emissivetexture_bright,
  etched_glass,
  etched_glass_amph,
  etched_glass_tech,
  fence_alpha,
  flame_test,
  glass_2nduv_glow,
  glass_2nduv_reflect_glow,
  glass_2nduvfor_glow,
  glass_2uv_rgb_reflect_glow,
  glass_2uv_rgb_reflect_normal_glow,
  glass_colour_spec_trans,
  glass_glow,
  glass_reflect,
  glass_reflect_normal,
  glass_reflect_opacity,
  glass_reflect_opacity_normal,
  glass_reflect_seperateopacity_normal,
  glass_texture,
  glass_texture_clamped,
  glass_texture_customr,
  glass_texture_n,
  glass_texture_wrecked,
  glassalpha,
  glassalpha_customr,
  glasstest,
  glasstestnoalpha,
  glow_transparent_overlay,
  gradientcolour1,
  grass_overlay,
  hd_bomb,
  hexagonalshield_alpha,
  hexagonalshield_rich,
  hologram,
  hologram_strip,
  hologram_strip_spec,
  holographic_projector2,
  holographic_test,
  j_alphascalar,
  j_diffuse_colour_tint_spec,
  j_rgb_colourtintnormalreflect,
  jd_2uvoverlay,
  jd_2uvoverlayspecular,
  jd_alphalambert,
  jd_alphalambert_alphatest,
  jd_alphalambert_test,
  jd_alphaspecular,
  jd_lambertalpha,
  jd_landinglights,
  jd_simplelambert,
  jd_simplespecular,
  jd_spec2uvoverlay,
  jd_uvanim_emissivealphamultiply,
  lambert,
  lambert_alpha_02,
  lambert_alpha_v02,
  lambert_simple,
  lambert_spec_mult,
  lambert_spec_mult_emissive_scroll,
  lambert_spec_mult_scroll,
  lambert_spec_reflect_mult,
  lambert_spec_reflect_mult_emissive,
  lambertemissive,
  lambertzeroalpha,
  lightbarrierframeglow,
  lightbarrierpanel_new_additive,
  loop_the_loop_caps,
  loopmaterial,
  m_01_normal_diffuse_specularonalpha,
  m_2diffuse_plus_spec_blend_via_alpha_n,
  m_2uv_offset_lights,
  m_diffuse_normal_constantspecular,
  mag_effect_loop_opaque,
  mageffect08,
  mageffect08_floor,
  mageffect08_lh,
  mageffect_modded,
  mageffectloop,
  mar_diffuse_specular,
  martin_inflatable,
  martin_inflatable2,
  medal,
  mesh_colour_constant,
  metallic,
  mr_2nduvanimdiffuseemissive,
  mr_coloured_specular,
  mr_diffuse_emissive_alpha_glow_specular,
  mr_shopwin_reflecttranspemis,
  mr_stem,
  mr_uvanim_em_alpha,
  mr_uvanim_em_glow,
  mr_waterfall,
  mt_2uv_fresnel,
  mt_additive_glow,
  mt_additive_glow_outline,
  mt_diffuse_alpha_invert,
  mt_diffuse_glow_specular,
  mt_diffuse_glow_specular_01,
  mt_diffuse_specular,
  mt_tunnelrefraction,
  mt_uvanim_diffuse_emissive,
  mt_uvanim_diffuse_emissive2,
  mt_uvanim_diffuse_emissive3tokey,
  mt_uvanim_diffuse_emissive3tokey_v_scroll,
  mt_windows_a,
  mt_windows_c_opaque,
  nitro_body_new,
  nitro_emissive_outlines,
  nitro_perspex_new,
  nr_alphatransparentholo,
  nr_billboardholographicscanlines,
  nr_crowd_bustle,
  nr_facinglcdstrips,
  nr_greyscale2colour,
  nr_holobowlparallax,
  nr_lcd_strips_alpha,
  nr_pixellate,
  nr_scalinguvs,
  nr_splitrgbscreen,
  nr_tvarray_02,
  nr_twinblend,
  ns_adbanner,
  orange_glass,
  outerstripeseffect,
  outersurround01,
  pb_diffalphaspecemmisive_jd,
  pb_diffalphaspecnormal,
  pb_diffspecemiss,
  pb_diffusealfa4opacity_specscalar,
  pb_diffusealpha4spec,
  pb_glass_2nduv_reflect_specular1_glow,
  pb_rooftop_das_g_r,
  pb_window,
  pb_window_o,
  pipefx_v2,
  reflectplane_dc_seawater,
  reflectplane_dc_seawateredging,
  reversed_diffuse_specular_normal,
  rocksandblend_via_diffuse_2,
  scanlinebillboard,
  scanlinebillboard_alphaboost,
  scanlinebillboard_desaturate,
  scanlinetext,
  scroller_glow_v3,
  scroller_glow_v4,
  sebenco_ice,
  sebenco_snow,
  sebenco_snow_just_snow,
  ship_lod_vcol,
  sign_emissive,
  sign_emissive_alpha,
  sign_emissive_glow,
  sign_emissive_glow2uv,
  signcl_emissive_glow,
  simplefogdiffuse,
  simpletexture,
  simpletextureandtexturealpha,
  simpletextureandtexturealphauvoffsetscale,
  simpletextureuvoffsetscale,
  solar_iridescence_reflect,
  sourcerpulse,
  speedup_material,
  standard_diffuse,
  tech_de_ra_cloud_effect,
  tech_de_ra_diffuse_spec,
  tech_de_ra_diffuse_spec_test,
  tech_de_ra_emissive,
  tech_de_ra_rock_floor,
  tech_de_ra_rocks,
  tech_lights_emissive,
  temp_glass,
  temp_testing_mat_colour_spec_alpha,
  temp_testing_mat_diffuse,
  test,
  track_coloured_specular,
  track_coloured_specular_alpha4glow,
  track_surface,
  track_surface_no_emissive,
  track_wall,
  tracktexture_with_normal,
  tunnel_fx_glass,
  tunnel_fx_noalpha,
  tunnel_fx_noalpha_mult,
  uv_anim_diffuse_alpha,
  uv_anim_diffuse_alpha_emissive,
  uv_distortion,
  uvanim_diffuse_emissive,
  uvanim_diffuse_emissive_bloom,
  uvanim_diffuse_emissive_coltint,
  uvanim_diffuse_emissive_coltint_bloom,
  uvanim_diffuse_emissivealpha,
  uvdistortion_diff_vertexcol,
  uvdistortion_diff_vertexcolplusoverlay,
  uvdistortion_diff_vertexcolplusoverlaybloom,
  vertclr_diff_emissive_alpha_glow,
  vertxclr_simplespec,
  water,
  water_noref,
  water_test_2,
  weapon_pads,
  wes_billboardholographicscanlines,
  wes_diffuse_colourtint_specular,
  wes_grassvariant,
  windowlight,
  windowsdiffusespecular_nonemissive_customr,
  windowsnormaldiffusespecular,
  windowsnormaldiffusespecular_nonemissive_customr,
  yellowbarfx,
  // WipEout 2048
  engine_additive_2048,
  ship_glass_dg_2048,
  ship_lights_2048,
  ship_paint_shiny_final_2048,
  ship_tech_2048,
];

/**
 * Factories by the engine's hash of their name, built once.
 *
 * Two reasons to key on the hash rather than the string. It is the identity the
 * format itself uses -- every name in a .rcsmodel or .rcsmaterial is stored as
 * CRC32 of the authored name, so matching on the hash matches the way the
 * engine does. And it turns a 371-entry linear scan, run once per material of
 * every model loaded, into a single map lookup.
 *
 * The string name is kept on the factory for debugging and for the warnings
 * below; it is no longer what selects the factory.
 */
const FACTORIES_BY_HASH = new Map<number, MaterialFactory>(
  FACTORIES.map((factory) => [rcsHash(factory.name), factory])
);

export function createMaterial(name: string, textures: THREE.Texture[]) {
  const factory = FACTORIES_BY_HASH.get(rcsHash(name));

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
    const material = factory.make(textures);
    material.name = name;
    return material;
  }

  console.warn(`Unsupported material: ${name} ${textures}`);
  return new THREE.MeshStandardMaterial({
    name,
    side: THREE.DoubleSide,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.0,
    ...(textures.length > 0 && textures[0] ? { map: textures[0] } : {}),
  });
}

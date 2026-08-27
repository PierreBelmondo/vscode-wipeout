/**
 * The curated texture samples the golden suite covers.
 *
 * Chosen for coverage, not volume: every format the GTF loader decodes, square
 * and non-square sizes, tiny textures, deep mip levels, and cube faces both
 * with and without a mip chain -- the cube stride (128-byte face alignment) is
 * exactly the kind of bug this suite exists to pin down.
 *
 * `source` is relative to the project-example root. `mip` indexes the decoded
 * chain; `face` selects a cube face (0..5 = +X -X +Y -Y +Z -Z). Adding an
 * entry: run `npm run test:textures:gen`, eyeball the new PNG in golden/, and
 * commit it with the regenerated manifest.json.
 */
export type GoldenEntry = {
  name: string;
  source: string;
  mip?: number;
  face?: number;
};

export const GOLDEN_TEXTURES: GoldenEntry[] = [
  // DXT1, square, with a mip chain -- top, middle and deep levels.
  { name: "dxt1_aurora_clouds_mip0", source: "ps3/hdf/data/aurora/textures/hd_aurora_clouds.gtf", mip: 0 },
  { name: "dxt1_aurora_clouds_mip2", source: "ps3/hdf/data/aurora/textures/hd_aurora_clouds.gtf", mip: 2 },
  { name: "dxt1_aurora_clouds_mip5", source: "ps3/hdf/data/aurora/textures/hd_aurora_clouds.gtf", mip: 5 },
  // DXT1, tiny (8x8: two blocks).
  { name: "dxt1_flyer_8x8", source: "ps3/hdf/data/billboards/hd_adverts/321go/hd_flyer_col.gtf", mip: 0 },
  // DXT5, non-square (64x128), top and deep mip.
  { name: "dxt5_321go_mip0", source: "ps3/hdf/data/billboards/hd_adverts/321go/321_go_64.gtf", mip: 0 },
  { name: "dxt5_321go_mip3", source: "ps3/hdf/data/billboards/hd_adverts/321go/321_go_64.gtf", mip: 3 },
  // DXT5, large non-square (2048x1024), sampled at a small mip.
  { name: "dxt5_321go_zone_mip3", source: "ps3/hdf/data/billboards/hd_adverts/321go/321_go_zone.gtf", mip: 3 },
  // DXT3, non-square and single-mip square.
  { name: "dxt3_auricom_mip0", source: "ps3/hdf/data/environments/01_vineta_k/hd_textures/dds/ad_auricom_vert_frame1.gtf", mip: 0 },
  { name: "dxt3_emblem_256", source: "ps3/hdf/data/environments/01_vineta_k/fe/trackselectemblem_bw.gtf", mip: 0 },
  // A8R8G8B8, degenerate sizes (3x1 with a 1x1 mip, and a bare 1x1).
  { name: "argb_gradient_3x1_mip0", source: "ps3/hdf/data/environments/zone_2/textures/gradienttex_tr01_set01.gtf", mip: 0 },
  { name: "argb_gradient_3x1_mip1", source: "ps3/hdf/data/environments/zone_2/textures/gradienttex_tr01_set01.gtf", mip: 1 },
  { name: "argb_tracktexture_1x1", source: "ps3/hdf/data/environments/zone_1/textures/tracktexture.gtf", mip: 0 },
  // DXT5 with a full 256->1 chain: every level, because "the mipmaps look
  // broken" is only diagnosable by looking at each one -- and once validated,
  // the whole chain is pinned, tail blocks included (2x2 and 1x1 still occupy
  // a full DXT block).
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `dxt5_caustics_mip${i}`,
    source: "ps3/hdf/data/tex/caustics/caustic_cells_b.gtf",
    mip: i,
  })),
  // DXT1 with a full 128->1 chain, same reason as the caustics above.
  ...Array.from({ length: 8 }, (_, i) => ({
    name: `dxt1_torch_mip${i}`,
    source: "ps3/hdf/data/tex/projector/torch.gtf",
    mip: i,
  })),
  // DDS: DXT1 with a chain (top level skipped -- 512x512 is a large PNG for
  // a placeholder), a DXT1 environment texture, and the 32-bit float crowd
  // impostor banks, which exercise the FourCC-116 path and the float->8-bit
  // export. (The 16-bit luminance+alpha impostor UV banks are 2048x2048 with
  // no chain -- too large for a golden -- and stay unpinned.)
  { name: "dds_dxt1_placeholder_mip1", source: "ps3/NPEA00000/USRDIR/data/materials/place_holder.dds", mip: 1 },
  { name: "dds_dxt1_placeholder_mip6", source: "ps3/NPEA00000/USRDIR/data/materials/place_holder.dds", mip: 6 },
  { name: "dds_dxt1_green_win_mip0", source: "ps3/NPEA00000/USRDIR/data/environments/04_chenghou_project/hd_textures/ad_green_win.dds", mip: 0 },
  { name: "dds_fp32_impostor_clamp", source: "ps3/BCES-00005/bahrain/tracks/crowds/impostor_pc_clamp_bank_0.dds", mip: 0 },
  { name: "dds_fp32_impostor_offsets", source: "ps3/BCES-00005/bahrain/tracks/crowds/impostor_pc_offsets_bank_0.dds", mip: 0 },
  // Cube with a full mip chain per face: all six faces at mip 3 (256x256).
  // The face stride is 128-byte aligned, so faces 1..5 are exactly what a
  // mis-strided split corrupts -- sol2's sky is the file that caught that bug.
  { name: "cube_sol2_face0_mip3", source: "ps3/hdf/data/environments/12_sol_2/sky.gtf", face: 0, mip: 3 },
  { name: "cube_sol2_face1_mip3", source: "ps3/hdf/data/environments/12_sol_2/sky.gtf", face: 1, mip: 3 },
  { name: "cube_sol2_face2_mip3", source: "ps3/hdf/data/environments/12_sol_2/sky.gtf", face: 2, mip: 3 },
  { name: "cube_sol2_face3_mip3", source: "ps3/hdf/data/environments/12_sol_2/sky.gtf", face: 3, mip: 3 },
  { name: "cube_sol2_face4_mip3", source: "ps3/hdf/data/environments/12_sol_2/sky.gtf", face: 4, mip: 3 },
  { name: "cube_sol2_face5_mip3", source: "ps3/hdf/data/environments/12_sol_2/sky.gtf", face: 5, mip: 3 },
];

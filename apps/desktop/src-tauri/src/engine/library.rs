//! Built-in fixture library: manufacturers, categories, channel modes.

use super::model::{AttributeDef, FeatureGroup, FixtureDefinition};

pub fn builtin_definitions() -> Vec<FixtureDefinition> {
    let mut defs = Vec::new();
    defs.extend(generic_fixtures());
    defs.extend(laserworld_fixtures());
    defs.extend(fun_generation_fixtures());
    defs.extend(stairville_fixtures());
    defs.extend(chauvet_martin_fixtures());
    defs
}

fn def(
    id: &str,
    manufacturer: &str,
    name: &str,
    mode: &str,
    category: &str,
    channel_count: u16,
    attributes: Vec<AttributeDef>,
) -> FixtureDefinition {
    FixtureDefinition {
        id: id.into(),
        manufacturer: manufacturer.into(),
        name: name.into(),
        mode: mode.into(),
        category: category.into(),
        channel_count,
        attributes,
    }
}

fn attr(name: &str, feature_group: FeatureGroup, offset: u16) -> AttributeDef {
    AttributeDef {
        name: name.into(),
        feature_group,
        offset,
        fine_offset: None,
        default: 0,
        highlight: 255,
    }
}

fn attr_default(name: &str, feature_group: FeatureGroup, offset: u16, default: u8) -> AttributeDef {
    AttributeDef {
        name: name.into(),
        feature_group,
        offset,
        fine_offset: None,
        default,
        highlight: if default == 0 { 255 } else { default },
    }
}

fn shutter_open(offset: u16) -> AttributeDef {
    attr_default("shutter", FeatureGroup::Beam, offset, 255)
}

fn pan_tilt(pan: u16, pan_fine: u16, tilt: u16, tilt_fine: u16) -> Vec<AttributeDef> {
    vec![
        AttributeDef {
            name: "pan".into(),
            feature_group: FeatureGroup::Position,
            offset: pan,
            fine_offset: Some(pan_fine),
            default: 127,
            highlight: 127,
        },
        AttributeDef {
            name: "tilt".into(),
            feature_group: FeatureGroup::Position,
            offset: tilt,
            fine_offset: Some(tilt_fine),
            default: 127,
            highlight: 127,
        },
    ]
}

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------

fn generic_fixtures() -> Vec<FixtureDefinition> {
    vec![
        def("generic.dimmer", "Generic", "Dimmer", "1ch", "Dimmer", 1, vec![attr("dimmer", FeatureGroup::Dimmer, 0)]),
        def("generic.dimmer_fine", "Generic", "Dimmer 16-bit", "2ch", "Dimmer", 2, vec![AttributeDef {
            name: "dimmer".into(), feature_group: FeatureGroup::Dimmer, offset: 0, fine_offset: Some(1), default: 0, highlight: 255,
        }]),
        def("generic.strobe", "Generic", "Strobe", "2ch", "Effect", 2, vec![
            attr("dimmer", FeatureGroup::Dimmer, 0), shutter_open(1),
        ]),
        def("generic.rgb", "Generic", "RGB Par", "3ch", "LED", 3, vec![
            attr("red", FeatureGroup::Color, 0), attr("green", FeatureGroup::Color, 1), attr("blue", FeatureGroup::Color, 2),
        ]),
        def("generic.rgbw", "Generic", "RGBW Par", "4ch", "LED", 4, vec![
            attr("red", FeatureGroup::Color, 0), attr("green", FeatureGroup::Color, 1),
            attr("blue", FeatureGroup::Color, 2), attr("white", FeatureGroup::Color, 3),
        ]),
        def("generic.rgba", "Generic", "RGBA Par", "4ch", "LED", 4, vec![
            attr("red", FeatureGroup::Color, 0), attr("green", FeatureGroup::Color, 1),
            attr("blue", FeatureGroup::Color, 2), attr("amber", FeatureGroup::Color, 3),
        ]),
        def("generic.rgbwa", "Generic", "RGBWA Par", "5ch", "LED", 5, vec![
            attr("red", FeatureGroup::Color, 0), attr("green", FeatureGroup::Color, 1),
            attr("blue", FeatureGroup::Color, 2), attr("white", FeatureGroup::Color, 3),
            attr("amber", FeatureGroup::Color, 4),
        ]),
        def("generic.led_wash", "Generic", "LED Wash", "7ch", "LED", 7, vec![
            attr("dimmer", FeatureGroup::Dimmer, 0), shutter_open(1),
            attr("red", FeatureGroup::Color, 2), attr("green", FeatureGroup::Color, 3),
            attr("blue", FeatureGroup::Color, 4), attr("white", FeatureGroup::Color, 5),
        ]),
        def("generic.led_bar", "Generic", "LED Bar", "5ch", "LED", 5, vec![
            attr("dimmer", FeatureGroup::Dimmer, 0), shutter_open(1),
            attr("red", FeatureGroup::Color, 2), attr("green", FeatureGroup::Color, 3), attr("blue", FeatureGroup::Color, 4),
        ]),
        {
            let mut a = pan_tilt(0, 1, 2, 3);
            a.push(attr("dimmer", FeatureGroup::Dimmer, 4));
            a.push(attr("red", FeatureGroup::Color, 5));
            a.push(attr("green", FeatureGroup::Color, 6));
            a.push(attr("blue", FeatureGroup::Color, 7));
            def("generic.moving_head", "Generic", "Simple Moving Head", "8ch", "Moving Light", 8, a)
        },
        {
            let mut a = pan_tilt(0, 1, 2, 3);
            a.extend([
                attr("dimmer", FeatureGroup::Dimmer, 4), shutter_open(5),
                attr("red", FeatureGroup::Color, 6), attr("green", FeatureGroup::Color, 7),
                attr("blue", FeatureGroup::Color, 8), attr("white", FeatureGroup::Color, 9),
                attr_default("zoom", FeatureGroup::Beam, 10, 127),
            ]);
            def("generic.moving_wash", "Generic", "Moving Wash", "11ch", "Moving Light", 11, a)
        },
        def("generic.fog", "Generic", "Fog Machine", "1ch", "Atmos", 1, vec![attr("dimmer", FeatureGroup::Dimmer, 0)]),
        def("generic.hazer", "Generic", "Hazer", "2ch", "Atmos", 2, vec![
            attr("dimmer", FeatureGroup::Dimmer, 0), attr("fan", FeatureGroup::Other, 1),
        ]),
        def("generic.blinder", "Generic", "Blinder 2-lite", "2ch", "Effect", 2, vec![
            attr("dimmer", FeatureGroup::Dimmer, 0), attr("dimmer_2", FeatureGroup::Dimmer, 1),
        ]),
    ]
}

// ---------------------------------------------------------------------------
// Laserworld — DJ + Professional modes (ShowNET-style)
// ---------------------------------------------------------------------------

/// Compact DJ personality used across many Laserworld ShowNET units.
fn laserworld_dj_attrs() -> Vec<AttributeDef> {
    vec![
        attr("mode", FeatureGroup::Other, 0),
        attr("pattern", FeatureGroup::Other, 1),
        attr_default("size", FeatureGroup::Beam, 2, 127),
        attr_default("x", FeatureGroup::Position, 3, 127),
        attr_default("y", FeatureGroup::Position, 4, 127),
        attr("rotation", FeatureGroup::Position, 5),
        attr("color", FeatureGroup::Color, 6),
        attr("strobe", FeatureGroup::Beam, 7),
        attr("dimmer", FeatureGroup::Dimmer, 8),
    ]
}

/// Extended professional personality (34ch ShowNET-style approx.).
fn laserworld_pro_attrs() -> Vec<AttributeDef> {
    vec![
        attr("mode", FeatureGroup::Other, 0),
        attr("pattern_bank", FeatureGroup::Other, 1),
        attr("pattern", FeatureGroup::Other, 2),
        attr_default("size_x", FeatureGroup::Beam, 3, 127),
        attr_default("size_y", FeatureGroup::Beam, 4, 127),
        attr_default("x", FeatureGroup::Position, 5, 127),
        attr_default("y", FeatureGroup::Position, 6, 127),
        attr("rotation", FeatureGroup::Position, 7),
        attr("zoom", FeatureGroup::Beam, 8),
        attr("scan_speed", FeatureGroup::Other, 9),
        attr("red", FeatureGroup::Color, 10),
        attr("green", FeatureGroup::Color, 11),
        attr("blue", FeatureGroup::Color, 12),
        attr("color_macro", FeatureGroup::Color, 13),
        attr("strobe", FeatureGroup::Beam, 14),
        attr("dimmer", FeatureGroup::Dimmer, 15),
        attr("effect", FeatureGroup::Other, 16),
        attr("effect_speed", FeatureGroup::Other, 17),
        attr("wave", FeatureGroup::Other, 18),
        attr("tunnel", FeatureGroup::Other, 19),
        attr("segment", FeatureGroup::Other, 20),
        attr("points", FeatureGroup::Other, 21),
        attr("blanking", FeatureGroup::Beam, 22),
        attr("safety_zone", FeatureGroup::Other, 23),
        attr("geo_x", FeatureGroup::Position, 24),
        attr("geo_y", FeatureGroup::Position, 25),
        attr("geo_size", FeatureGroup::Beam, 26),
        attr("geo_rot", FeatureGroup::Position, 27),
        attr("keystone", FeatureGroup::Other, 28),
        attr("master_dim", FeatureGroup::Dimmer, 29),
        attr("color_shift", FeatureGroup::Color, 30),
        attr("animation", FeatureGroup::Other, 31),
        attr("anim_speed", FeatureGroup::Other, 32),
        attr("reset", FeatureGroup::Other, 33),
    ]
}

fn laserworld_model(slug: &str, name: &str) -> Vec<FixtureDefinition> {
    vec![
        def(
            &format!("laserworld.{slug}.dj"),
            "Laserworld",
            name,
            "DJ 9ch",
            "Laser",
            9,
            laserworld_dj_attrs(),
        ),
        def(
            &format!("laserworld.{slug}.pro"),
            "Laserworld",
            name,
            "Professional 34ch",
            "Laser",
            34,
            laserworld_pro_attrs(),
        ),
    ]
}

fn laserworld_fixtures() -> Vec<FixtureDefinition> {
    let mut out = Vec::new();
    // Entry / Club
    out.extend(laserworld_model("el_200_rgb", "EL-200RGB"));
    out.extend(laserworld_model("el_400_rgb", "EL-400RGB"));
    out.extend(laserworld_model("el_600_rgb", "EL-600RGB"));
    out.extend(laserworld_model("cs_1000_rgb", "CS-1000RGB ShowNET"));
    out.extend(laserworld_model("cs_2000_rgb", "CS-2000RGB ShowNET"));
    out.extend(laserworld_model("cs_4000_rgb", "CS-4000RGB ShowNET"));
    out.extend(laserworld_model("cs_12k_rgb", "CS-12.000RGB ShowNET"));
    out.extend(laserworld_model("cs_24k_rgb", "CS-24.000RGB ShowNET"));
    // Diode Series
    out.extend(laserworld_model("ds_1000_rgb", "DS-1000RGB MK5"));
    out.extend(laserworld_model("ds_2000_rgb", "DS-2000RGB MK5"));
    out.extend(laserworld_model("ds_3000_rgb", "DS-3000RGB MK5"));
    out.extend(laserworld_model("ds_4000_rgb", "DS-4000RGB MK5"));
    // Purelight / Pro
    out.extend(laserworld_model("pl_10k_rgb", "PL-10.000RGB"));
    out.extend(laserworld_model("pl_20k_rgb", "PL-20.000RGB MK3"));
    out.extend(laserworld_model("pl_30k_rgb", "PL-30.000RGB IP65"));
    // Tarm / Clubmax style
    out.extend(laserworld_model("tarm_3", "tarm 3"));
    out.extend(laserworld_model("tarm_5", "tarm 5"));
    out.extend(laserworld_model("clubmax_3000", "Clubmax 3000 RGB"));
    out.extend(laserworld_model("clubmax_6000", "Clubmax 6000 RGB"));
    // Cubes
    out.extend(laserworld_model("cube_200", "CUBE 200"));
    out.extend(laserworld_model("cube_400", "CUBE 400"));
    // Extra: ILDA-only footprint as 16ch simplified graphics mode
    out.push(def(
        "laserworld.shownet.artnet_16",
        "Laserworld",
        "ShowNET Art-Net Compact",
        "16ch",
        "Laser",
        16,
        {
            let mut a = laserworld_dj_attrs();
            a.extend([
                attr("red", FeatureGroup::Color, 9),
                attr("green", FeatureGroup::Color, 10),
                attr("blue", FeatureGroup::Color, 11),
                attr("effect", FeatureGroup::Other, 12),
                attr("effect_speed", FeatureGroup::Other, 13),
                attr("master_dim", FeatureGroup::Dimmer, 14),
                attr("reset", FeatureGroup::Other, 15),
            ]);
            a
        },
    ));
    out
}

// ---------------------------------------------------------------------------
// Fun Generation
// ---------------------------------------------------------------------------

fn fun_generation_fixtures() -> Vec<FixtureDefinition> {
    vec![
        // Laser Derby — 2ch / 8ch
        def(
            "fungeneration.laser_derby.2ch",
            "Fun Generation",
            "Laser Derby",
            "2ch",
            "Laser",
            2,
            vec![
                attr("mode", FeatureGroup::Other, 0),
                attr("speed", FeatureGroup::Other, 1),
            ],
        ),
        def(
            "fungeneration.laser_derby.8ch",
            "Fun Generation",
            "Laser Derby",
            "8ch",
            "Laser",
            8,
            vec![
                attr("mode", FeatureGroup::Other, 0),
                attr("derby_dimmer", FeatureGroup::Dimmer, 1),
                attr("derby_red", FeatureGroup::Color, 2),
                attr("derby_green", FeatureGroup::Color, 3),
                attr("derby_blue", FeatureGroup::Color, 4),
                attr("derby_white", FeatureGroup::Color, 5),
                attr("laser_pattern", FeatureGroup::Other, 6),
                attr("strobe", FeatureGroup::Beam, 7),
            ],
        ),
        def(
            "fungeneration.mini_laser.5ch",
            "Fun Generation",
            "Mini Laser RG",
            "5ch",
            "Laser",
            5,
            vec![
                attr("mode", FeatureGroup::Other, 0),
                attr("pattern", FeatureGroup::Other, 1),
                attr("speed", FeatureGroup::Other, 2),
                attr("strobe", FeatureGroup::Beam, 3),
                attr("color", FeatureGroup::Color, 4),
            ],
        ),
        def(
            "fungeneration.mini_laser.9ch",
            "Fun Generation",
            "Mini Laser RG",
            "9ch",
            "Laser",
            9,
            vec![
                attr("mode", FeatureGroup::Other, 0),
                attr("pattern", FeatureGroup::Other, 1),
                attr_default("x", FeatureGroup::Position, 2, 127),
                attr_default("y", FeatureGroup::Position, 3, 127),
                attr("size", FeatureGroup::Beam, 4),
                attr("rotation", FeatureGroup::Position, 5),
                attr("color", FeatureGroup::Color, 6),
                attr("strobe", FeatureGroup::Beam, 7),
                attr("dimmer", FeatureGroup::Dimmer, 8),
            ],
        ),
        def(
            "fungeneration.led_par_64.3ch",
            "Fun Generation",
            "LED Pot 64 RGB",
            "3ch",
            "LED",
            3,
            vec![
                attr("red", FeatureGroup::Color, 0),
                attr("green", FeatureGroup::Color, 1),
                attr("blue", FeatureGroup::Color, 2),
            ],
        ),
        def(
            "fungeneration.led_par_64.7ch",
            "Fun Generation",
            "LED Pot 64 RGB",
            "7ch",
            "LED",
            7,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("red", FeatureGroup::Color, 1),
                attr("green", FeatureGroup::Color, 2),
                attr("blue", FeatureGroup::Color, 3),
                attr("strobe", FeatureGroup::Beam, 4),
                attr("macro", FeatureGroup::Color, 5),
                attr("macro_speed", FeatureGroup::Other, 6),
            ],
        ),
        def(
            "fungeneration.uv_cannon.1ch",
            "Fun Generation",
            "UV Cannon",
            "1ch",
            "Effect",
            1,
            vec![attr("dimmer", FeatureGroup::Dimmer, 0)],
        ),
        def(
            "fungeneration.uv_cannon.2ch",
            "Fun Generation",
            "UV Cannon",
            "2ch",
            "Effect",
            2,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("strobe", FeatureGroup::Beam, 1),
            ],
        ),
        def(
            "fungeneration.strobe.2ch",
            "Fun Generation",
            "LED Strobe",
            "2ch",
            "Effect",
            2,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("strobe", FeatureGroup::Beam, 1),
            ],
        ),
        def(
            "fungeneration.strobe.4ch",
            "Fun Generation",
            "LED Strobe",
            "4ch",
            "Effect",
            4,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("strobe", FeatureGroup::Beam, 1),
                attr("duration", FeatureGroup::Beam, 2),
                attr("mode", FeatureGroup::Other, 3),
            ],
        ),
    ]
}

// ---------------------------------------------------------------------------
// Stairville
// ---------------------------------------------------------------------------

fn stairville_fixtures() -> Vec<FixtureDefinition> {
    vec![
        // DJLase lasers
        def(
            "stairville.djlase_gr140.5ch",
            "Stairville",
            "DJLase GR-140 RGY",
            "5ch",
            "Laser",
            5,
            vec![
                attr("mode", FeatureGroup::Other, 0),
                attr("pattern", FeatureGroup::Other, 1),
                attr("speed", FeatureGroup::Other, 2),
                attr("strobe", FeatureGroup::Beam, 3),
                attr("color", FeatureGroup::Color, 4),
            ],
        ),
        def(
            "stairville.djlase_150.16ch",
            "Stairville",
            "DJLase 150 RGY",
            "16ch",
            "Laser",
            16,
            vec![
                attr("mode", FeatureGroup::Other, 0),
                attr("pattern_a", FeatureGroup::Other, 1),
                attr("pattern_b", FeatureGroup::Other, 2),
                attr("pattern_c", FeatureGroup::Other, 3),
                attr("pattern_d", FeatureGroup::Other, 4),
                attr("pattern_select", FeatureGroup::Other, 5),
                attr_default("x", FeatureGroup::Position, 6, 127),
                attr_default("y", FeatureGroup::Position, 7, 127),
                attr("size", FeatureGroup::Beam, 8),
                attr("rotation", FeatureGroup::Position, 9),
                attr("scan_speed", FeatureGroup::Other, 10),
                attr("color", FeatureGroup::Color, 11),
                attr("strobe", FeatureGroup::Beam, 12),
                attr("dimmer", FeatureGroup::Dimmer, 13),
                attr("effect", FeatureGroup::Other, 14),
                attr("reset", FeatureGroup::Other, 15),
            ],
        ),
        def(
            "stairville.djlase_150.9ch",
            "Stairville",
            "DJLase 150 RGY",
            "9ch",
            "Laser",
            9,
            laserworld_dj_attrs(),
        ),
        // LED PAR
        def(
            "stairville.led_par_56.3ch",
            "Stairville",
            "LED PAR 56",
            "3ch",
            "LED",
            3,
            vec![
                attr("red", FeatureGroup::Color, 0),
                attr("green", FeatureGroup::Color, 1),
                attr("blue", FeatureGroup::Color, 2),
            ],
        ),
        def(
            "stairville.led_par_56.5ch",
            "Stairville",
            "LED PAR 56",
            "5ch",
            "LED",
            5,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("red", FeatureGroup::Color, 1),
                attr("green", FeatureGroup::Color, 2),
                attr("blue", FeatureGroup::Color, 3),
                attr("strobe", FeatureGroup::Beam, 4),
            ],
        ),
        def(
            "stairville.led_par_56.7ch",
            "Stairville",
            "LED PAR 56",
            "7ch",
            "LED",
            7,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("red", FeatureGroup::Color, 1),
                attr("green", FeatureGroup::Color, 2),
                attr("blue", FeatureGroup::Color, 3),
                attr("strobe", FeatureGroup::Beam, 4),
                attr("macro", FeatureGroup::Color, 5),
                attr("macro_speed", FeatureGroup::Other, 6),
            ],
        ),
        def(
            "stairville.led_par_64.3ch",
            "Stairville",
            "LED PAR 64 COB RGBW",
            "3ch",
            "LED",
            3,
            vec![
                attr("red", FeatureGroup::Color, 0),
                attr("green", FeatureGroup::Color, 1),
                attr("blue", FeatureGroup::Color, 2),
            ],
        ),
        def(
            "stairville.led_par_64.4ch",
            "Stairville",
            "LED PAR 64 COB RGBW",
            "4ch",
            "LED",
            4,
            vec![
                attr("red", FeatureGroup::Color, 0),
                attr("green", FeatureGroup::Color, 1),
                attr("blue", FeatureGroup::Color, 2),
                attr("white", FeatureGroup::Color, 3),
            ],
        ),
        def(
            "stairville.led_par_64.8ch",
            "Stairville",
            "LED PAR 64 COB RGBW",
            "8ch",
            "LED",
            8,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("red", FeatureGroup::Color, 1),
                attr("green", FeatureGroup::Color, 2),
                attr("blue", FeatureGroup::Color, 3),
                attr("white", FeatureGroup::Color, 4),
                attr("strobe", FeatureGroup::Beam, 5),
                attr("macro", FeatureGroup::Color, 6),
                attr("macro_speed", FeatureGroup::Other, 7),
            ],
        ),
        // MH moving heads
        {
            let mut a = pan_tilt(0, 1, 2, 3);
            a.extend([
                attr("dimmer", FeatureGroup::Dimmer, 4),
                shutter_open(5),
                attr("red", FeatureGroup::Color, 6),
                attr("green", FeatureGroup::Color, 7),
                attr("blue", FeatureGroup::Color, 8),
                attr("white", FeatureGroup::Color, 9),
            ]);
            def(
                "stairville.mh_x50.10ch",
                "Stairville",
                "MH-X50 LED Spot",
                "10ch",
                "Moving Light",
                10,
                a,
            )
        },
        {
            let mut a = pan_tilt(0, 1, 2, 3);
            a.extend([
                attr("dimmer", FeatureGroup::Dimmer, 4),
                shutter_open(5),
                attr("color_wheel", FeatureGroup::ColorWheel, 6),
                attr("gobo", FeatureGroup::Gobo, 7),
                attr("gobo_rotate", FeatureGroup::Gobo, 8),
                attr_default("focus", FeatureGroup::Beam, 9, 127),
                attr_default("prism", FeatureGroup::Beam, 10, 0),
                attr("pan_tilt_speed", FeatureGroup::Other, 11),
                attr("reset", FeatureGroup::Other, 12),
            ]);
            def(
                "stairville.mh_x50.13ch",
                "Stairville",
                "MH-X50 LED Spot",
                "13ch",
                "Moving Light",
                13,
                a,
            )
        },
        {
            let mut a = pan_tilt(0, 1, 2, 3);
            a.extend([
                attr("dimmer", FeatureGroup::Dimmer, 4),
                shutter_open(5),
                attr("red", FeatureGroup::Color, 6),
                attr("green", FeatureGroup::Color, 7),
                attr("blue", FeatureGroup::Color, 8),
                attr("white", FeatureGroup::Color, 9),
                attr_default("zoom", FeatureGroup::Beam, 10, 127),
                attr("pan_tilt_speed", FeatureGroup::Other, 11),
            ]);
            def(
                "stairville.mh_x200.12ch",
                "Stairville",
                "MH-X200 Wash",
                "12ch",
                "Moving Light",
                12,
                a,
            )
        },
        def(
            "stairville.stage_tri_led.3ch",
            "Stairville",
            "Stage TRI LED",
            "3ch",
            "LED",
            3,
            vec![
                attr("red", FeatureGroup::Color, 0),
                attr("green", FeatureGroup::Color, 1),
                attr("blue", FeatureGroup::Color, 2),
            ],
        ),
        def(
            "stairville.stage_tri_led.6ch",
            "Stairville",
            "Stage TRI LED",
            "6ch",
            "LED",
            6,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("red", FeatureGroup::Color, 1),
                attr("green", FeatureGroup::Color, 2),
                attr("blue", FeatureGroup::Color, 3),
                attr("strobe", FeatureGroup::Beam, 4),
                attr("macro", FeatureGroup::Color, 5),
            ],
        ),
        def(
            "stairville.af_150.1ch",
            "Stairville",
            "AF-150 Fog",
            "1ch",
            "Atmos",
            1,
            vec![attr("dimmer", FeatureGroup::Dimmer, 0)],
        ),
        def(
            "stairville.af_150.2ch",
            "Stairville",
            "AF-150 Fog",
            "2ch",
            "Atmos",
            2,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("interval", FeatureGroup::Other, 1),
            ],
        ),
        def(
            "stairville.led_bar_240.3ch",
            "Stairville",
            "LED Bar 240 RGB",
            "3ch",
            "LED",
            3,
            vec![
                attr("red", FeatureGroup::Color, 0),
                attr("green", FeatureGroup::Color, 1),
                attr("blue", FeatureGroup::Color, 2),
            ],
        ),
        def(
            "stairville.led_bar_240.5ch",
            "Stairville",
            "LED Bar 240 RGB",
            "5ch",
            "LED",
            5,
            vec![
                attr("dimmer", FeatureGroup::Dimmer, 0),
                attr("red", FeatureGroup::Color, 1),
                attr("green", FeatureGroup::Color, 2),
                attr("blue", FeatureGroup::Color, 3),
                attr("strobe", FeatureGroup::Beam, 4),
            ],
        ),
        def(
            "stairville.led_bar_240.24ch",
            "Stairville",
            "LED Bar 240 RGB",
            "24ch Pixel",
            "LED",
            24,
            (0..8)
                .flat_map(|i| {
                    let o = (i * 3) as u16;
                    [
                        attr(&format!("red_{}", i + 1), FeatureGroup::Color, o),
                        attr(&format!("green_{}", i + 1), FeatureGroup::Color, o + 1),
                        attr(&format!("blue_{}", i + 1), FeatureGroup::Color, o + 2),
                    ]
                })
                .collect(),
        ),
    ]
}

// ---------------------------------------------------------------------------
// Chauvet / Martin (kept from previous library)
// ---------------------------------------------------------------------------

fn chauvet_martin_fixtures() -> Vec<FixtureDefinition> {
    vec![
        {
            let mut a = pan_tilt(0, 1, 2, 3);
            a.extend([
                attr("dimmer", FeatureGroup::Dimmer, 4),
                shutter_open(5),
                attr("red", FeatureGroup::Color, 6),
                attr("green", FeatureGroup::Color, 7),
                attr("blue", FeatureGroup::Color, 8),
                attr("white", FeatureGroup::Color, 9),
                attr("amber", FeatureGroup::Color, 10),
                attr_default("zoom", FeatureGroup::Beam, 11, 127),
                attr("cto", FeatureGroup::Color, 12),
            ]);
            def(
                "chauvet.rogue_wash.13ch",
                "Chauvet",
                "Rogue Wash",
                "13ch",
                "Moving Light",
                13,
                a,
            )
        },
        {
            let mut a = pan_tilt(0, 1, 2, 3);
            a.extend([
                attr("dimmer", FeatureGroup::Dimmer, 4),
                shutter_open(5),
                attr("red", FeatureGroup::Color, 6),
                attr("green", FeatureGroup::Color, 7),
                attr("blue", FeatureGroup::Color, 8),
                attr("white", FeatureGroup::Color, 9),
            ]);
            def(
                "martin.mac_aura.10ch",
                "Martin",
                "MAC Aura Style",
                "10ch",
                "Moving Light",
                10,
                a,
            )
        },
    ]
}

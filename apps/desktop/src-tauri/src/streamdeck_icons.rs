//! Procedural Stream Deck key icons + tiny bitmap labels.

use image::{Rgb, RgbImage};

/// Built-in icon ids used by UI + hardware paint.
pub const ICON_IDS: &[&str] = &[
    "none",
    "blackout",
    "clear",
    "output",
    "go",
    "back",
    "dimmer",
    "zero",
    "shutter",
    "cue",
    "color",
    "fixture",
    "flash",
    "bolt",
    "fire",
    "star",
    "heart",
    "check",
    "cross",
    "warning",
    "play",
    "pause",
    "stop",
    "music",
    "laser",
    "fog",
    "snow",
    "fan",
    "circle",
    "square",
    "triangle",
    "arrow_up",
    "arrow_down",
    "arrow_left",
    "arrow_right",
];

pub fn default_icon_for_action(action_tag: &str) -> &'static str {
    match action_tag {
        "blackoutToggle" => "blackout",
        "clearProgrammer" => "clear",
        "outputToggle" => "output",
        "playbackGo" => "go",
        "playbackBack" => "back",
        "dimmerFull" => "dimmer",
        "dimmerZero" => "zero",
        "shutterOpen" | "shutterClosed" => "shutter",
        "selectFid" => "fixture",
        "fireCue" => "cue",
        "colorRed" | "colorGreen" | "colorBlue" | "colorWhite" | "colorCyan"
        | "colorMagenta" | "colorYellow" | "colorAmber" => "color",
        _ => "none",
    }
}

fn set_px(img: &mut RgbImage, x: i32, y: i32, c: Rgb<u8>) {
    if x < 0 || y < 0 {
        return;
    }
    let (w, h) = (img.width() as i32, img.height() as i32);
    if x >= w || y >= h {
        return;
    }
    img.put_pixel(x as u32, y as u32, c);
}

fn fill_rect(img: &mut RgbImage, x0: i32, y0: i32, x1: i32, y1: i32, c: Rgb<u8>) {
    for y in y0..=y1 {
        for x in x0..=x1 {
            set_px(img, x, y, c);
        }
    }
}

fn draw_line(img: &mut RgbImage, mut x0: i32, mut y0: i32, x1: i32, y1: i32, c: Rgb<u8>, thick: i32) {
    let dx = (x1 - x0).abs();
    let sx = if x0 < x1 { 1 } else { -1 };
    let dy = -(y1 - y0).abs();
    let sy = if y0 < y1 { 1 } else { -1 };
    let mut err = dx + dy;
    loop {
        for ty in -thick..=thick {
            for tx in -thick..=thick {
                set_px(img, x0 + tx, y0 + ty, c);
            }
        }
        if x0 == x1 && y0 == y1 {
            break;
        }
        let e2 = 2 * err;
        if e2 >= dy {
            err += dy;
            x0 += sx;
        }
        if e2 <= dx {
            err += dx;
            y0 += sy;
        }
    }
}

fn draw_circle(img: &mut RgbImage, cx: i32, cy: i32, r: i32, c: Rgb<u8>, fill: bool) {
    for y in -r..=r {
        for x in -r..=r {
            let d2 = x * x + y * y;
            if fill {
                if d2 <= r * r {
                    set_px(img, cx + x, cy + y, c);
                }
            } else if (d2 - r * r).abs() <= r {
                set_px(img, cx + x, cy + y, c);
            }
        }
    }
}

/// 5x7 uppercase-ish glyphs for labels (A-Z, 0-9, space, -, *, /, +).
fn glyph(ch: char) -> Option<[u8; 7]> {
    // Each row is a 5-bit mask (MSB left)
    let g = match ch.to_ascii_uppercase() {
        ' ' => [0, 0, 0, 0, 0, 0, 0],
        '-' => [0, 0, 0, 0b11111, 0, 0, 0],
        '*' => [0b00100, 0b10101, 0b01110, 0b00100, 0b01110, 0b10101, 0b00100],
        '+' => [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
        '/' => [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0, 0],
        '0' => [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
        '1' => [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
        '2' => [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
        '3' => [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
        '4' => [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
        '5' => [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
        '6' => [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
        '7' => [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
        '8' => [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
        '9' => [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
        'A' => [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
        'B' => [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
        'C' => [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
        'D' => [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
        'E' => [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
        'F' => [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
        'G' => [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
        'H' => [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
        'I' => [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
        'J' => [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
        'K' => [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
        'L' => [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
        'M' => [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
        'N' => [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
        'O' => [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        'P' => [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
        'Q' => [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
        'R' => [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
        'S' => [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
        'T' => [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
        'U' => [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        'V' => [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
        'W' => [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
        'X' => [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
        'Y' => [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
        'Z' => [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
        _ => return None,
    };
    Some(g)
}

fn draw_text(img: &mut RgbImage, text: &str, cx: i32, top: i32, fg: Rgb<u8>, scale: i32) {
    let chars: Vec<_> = text.chars().filter(|c| glyph(*c).is_some() || *c == ' ').collect();
    if chars.is_empty() {
        return;
    }
    let gw = 5 * scale + scale; // glyph + gap
    let total_w = chars.len() as i32 * gw - scale;
    let mut x = cx - total_w / 2;
    for ch in chars {
        if let Some(rows) = glyph(ch) {
            for (row, bits) in rows.iter().enumerate() {
                for col in 0..5 {
                    if bits & (0b10000 >> col) != 0 {
                        fill_rect(
                            img,
                            x + col * scale,
                            top + row as i32 * scale,
                            x + col * scale + scale - 1,
                            top + row as i32 * scale + scale - 1,
                            fg,
                        );
                    }
                }
            }
        }
        x += gw;
    }
}

fn contrast_fg(bg: [u8; 3]) -> Rgb<u8> {
    let lum = 0.2126 * bg[0] as f32 + 0.7152 * bg[1] as f32 + 0.0722 * bg[2] as f32;
    if lum > 140.0 {
        Rgb([18, 18, 18])
    } else {
        Rgb([245, 245, 245])
    }
}

fn draw_icon(img: &mut RgbImage, icon: &str, cx: i32, cy: i32, s: i32, fg: Rgb<u8>) {
    match icon {
        "blackout" => {
            fill_rect(img, cx - s, cy - s, cx + s, cy + s, fg);
            let inv = Rgb([
                255u8.saturating_sub(fg[0]),
                255u8.saturating_sub(fg[1]),
                255u8.saturating_sub(fg[2]),
            ]);
            draw_line(img, cx - s + 2, cy - s + 2, cx + s - 2, cy + s - 2, inv, 1);
        }
        "clear" => {
            draw_line(img, cx - s, cy - s, cx + s, cy + s, fg, 2);
            draw_line(img, cx + s, cy - s, cx - s, cy + s, fg, 2);
        }
        "output" => {
            draw_circle(img, cx, cy, s, fg, false);
            draw_circle(img, cx, cy, s / 3, fg, true);
        }
        "go" | "play" => {
            // triangle pointing right
            for y in -s..=s {
                let w = s - y.abs();
                fill_rect(img, cx - s / 2, cy + y, cx - s / 2 + w, cy + y, fg);
            }
        }
        "back" => {
            for y in -s..=s {
                let w = s - y.abs();
                fill_rect(img, cx + s / 2 - w, cy + y, cx + s / 2, cy + y, fg);
            }
            fill_rect(img, cx - s, cy - s / 2, cx - s + s / 3, cy + s / 2, fg);
        }
        "dimmer" => {
            fill_rect(img, cx - s / 4, cy - s, cx + s / 4, cy + s, fg);
            fill_rect(img, cx - s, cy - s / 6, cx + s, cy + s / 6, fg);
        }
        "zero" => {
            draw_circle(img, cx, cy, s, fg, false);
            draw_line(img, cx - s + 2, cy + s - 2, cx + s - 2, cy - s + 2, fg, 1);
        }
        "shutter" => {
            fill_rect(img, cx - s, cy - s / 2, cx + s, cy - s / 4, fg);
            fill_rect(img, cx - s, cy + s / 4, cx + s, cy + s / 2, fg);
            draw_circle(img, cx, cy, s / 3, fg, true);
        }
        "cue" => {
            draw_circle(img, cx, cy, s, fg, false);
            fill_rect(img, cx - 1, cy - s / 2, cx + 1, cy + s / 3, fg);
            fill_rect(img, cx - 1, cy + s / 2 - 2, cx + 1, cy + s / 2, fg);
        }
        "color" => {
            draw_circle(img, cx - s / 2, cy, s / 2, fg, true);
            draw_circle(img, cx + s / 2, cy - s / 3, s / 2, fg, true);
            draw_circle(img, cx + s / 3, cy + s / 2, s / 2, fg, true);
        }
        "fixture" => {
            fill_rect(img, cx - s / 2, cy - s, cx + s / 2, cy, fg);
            fill_rect(img, cx - s / 4, cy, cx + s / 4, cy + s, fg);
        }
        "flash" | "bolt" => {
            // lightning
            draw_line(img, cx + s / 3, cy - s, cx - s / 3, cy, fg, 2);
            draw_line(img, cx - s / 3, cy, cx + s / 3, cy, fg, 2);
            draw_line(img, cx + s / 3, cy, cx - s / 3, cy + s, fg, 2);
        }
        "fire" => {
            draw_circle(img, cx, cy + s / 4, s / 2, fg, true);
            fill_rect(img, cx - s / 3, cy - s, cx + s / 3, cy, fg);
        }
        "star" => {
            draw_line(img, cx, cy - s, cx, cy + s, fg, 1);
            draw_line(img, cx - s, cy, cx + s, cy, fg, 1);
            draw_line(img, cx - s * 2 / 3, cy - s * 2 / 3, cx + s * 2 / 3, cy + s * 2 / 3, fg, 1);
            draw_line(img, cx + s * 2 / 3, cy - s * 2 / 3, cx - s * 2 / 3, cy + s * 2 / 3, fg, 1);
        }
        "heart" => {
            draw_circle(img, cx - s / 2, cy - s / 3, s / 2, fg, true);
            draw_circle(img, cx + s / 2, cy - s / 3, s / 2, fg, true);
            for y in 0..=s {
                let w = s - y;
                fill_rect(img, cx - w, cy + y / 2, cx + w, cy + y / 2, fg);
            }
        }
        "check" => {
            draw_line(img, cx - s, cy, cx - s / 4, cy + s, fg, 2);
            draw_line(img, cx - s / 4, cy + s, cx + s, cy - s, fg, 2);
        }
        "cross" => {
            draw_line(img, cx - s, cy - s, cx + s, cy + s, fg, 2);
            draw_line(img, cx + s, cy - s, cx - s, cy + s, fg, 2);
        }
        "warning" => {
            draw_line(img, cx, cy - s, cx - s, cy + s, fg, 2);
            draw_line(img, cx, cy - s, cx + s, cy + s, fg, 2);
            draw_line(img, cx - s, cy + s, cx + s, cy + s, fg, 2);
            fill_rect(img, cx - 1, cy - s / 3, cx + 1, cy + s / 3, fg);
            fill_rect(img, cx - 1, cy + s / 2, cx + 1, cy + s / 2 + 2, fg);
        }
        "pause" => {
            fill_rect(img, cx - s, cy - s, cx - s / 3, cy + s, fg);
            fill_rect(img, cx + s / 3, cy - s, cx + s, cy + s, fg);
        }
        "stop" => fill_rect(img, cx - s, cy - s, cx + s, cy + s, fg),
        "music" => {
            fill_rect(img, cx + s / 3, cy - s, cx + s / 2, cy + s / 3, fg);
            draw_circle(img, cx - s / 3, cy + s / 3, s / 3, fg, true);
            draw_circle(img, cx + s / 3, cy + s / 2, s / 3, fg, true);
            draw_line(img, cx - s / 3, cy + s / 3, cx + s / 3, cy - s / 2, fg, 1);
        }
        "laser" => {
            draw_line(img, cx - s, cy + s / 2, cx + s, cy - s / 2, fg, 2);
            draw_circle(img, cx - s, cy + s / 2, 2, fg, true);
        }
        "fog" => {
            draw_circle(img, cx - s / 2, cy, s / 2, fg, true);
            draw_circle(img, cx + s / 3, cy - s / 3, s / 2, fg, true);
            draw_circle(img, cx, cy + s / 3, s / 2, fg, true);
        }
        "snow" => {
            draw_line(img, cx, cy - s, cx, cy + s, fg, 1);
            draw_line(img, cx - s, cy, cx + s, cy, fg, 1);
            draw_line(img, cx - s * 2 / 3, cy - s * 2 / 3, cx + s * 2 / 3, cy + s * 2 / 3, fg, 1);
            draw_line(img, cx + s * 2 / 3, cy - s * 2 / 3, cx - s * 2 / 3, cy + s * 2 / 3, fg, 1);
        }
        "fan" => {
            draw_circle(img, cx, cy, s / 4, fg, true);
            draw_line(img, cx, cy, cx, cy - s, fg, 2);
            draw_line(img, cx, cy, cx + s, cy + s / 2, fg, 2);
            draw_line(img, cx, cy, cx - s, cy + s / 2, fg, 2);
        }
        "circle" => draw_circle(img, cx, cy, s, fg, false),
        "square" => fill_rect(img, cx - s, cy - s, cx + s, cy + s, fg),
        "triangle" => {
            draw_line(img, cx, cy - s, cx - s, cy + s, fg, 2);
            draw_line(img, cx, cy - s, cx + s, cy + s, fg, 2);
            draw_line(img, cx - s, cy + s, cx + s, cy + s, fg, 2);
        }
        "arrow_up" => {
            draw_line(img, cx, cy + s, cx, cy - s, fg, 2);
            draw_line(img, cx, cy - s, cx - s / 2, cy - s / 3, fg, 2);
            draw_line(img, cx, cy - s, cx + s / 2, cy - s / 3, fg, 2);
        }
        "arrow_down" => {
            draw_line(img, cx, cy - s, cx, cy + s, fg, 2);
            draw_line(img, cx, cy + s, cx - s / 2, cy + s / 3, fg, 2);
            draw_line(img, cx, cy + s, cx + s / 2, cy + s / 3, fg, 2);
        }
        "arrow_left" => {
            draw_line(img, cx + s, cy, cx - s, cy, fg, 2);
            draw_line(img, cx - s, cy, cx - s / 3, cy - s / 2, fg, 2);
            draw_line(img, cx - s, cy, cx - s / 3, cy + s / 2, fg, 2);
        }
        "arrow_right" => {
            draw_line(img, cx - s, cy, cx + s, cy, fg, 2);
            draw_line(img, cx + s, cy, cx + s / 3, cy - s / 2, fg, 2);
            draw_line(img, cx + s, cy, cx + s / 3, cy + s / 2, fg, 2);
        }
        _ => {}
    }
}

pub fn render_key_image(size: u32, bg: [u8; 3], icon: &str, label: &str) -> RgbImage {
    let mut img = RgbImage::from_pixel(size, size, Rgb(bg));
    let fg = contrast_fg(bg);
    let s = (size as i32 / 6).max(4);
    let cx = size as i32 / 2;
    let icon_cy = (size as i32 * 42) / 100;
    let icon_id = if icon.is_empty() || icon == "none" {
        ""
    } else {
        icon
    };
    if !icon_id.is_empty() {
        draw_icon(&mut img, icon_id, cx, icon_cy, s, fg);
    }

    let label = label.trim();
    if !label.is_empty() && label != "—" {
        let scale = if size >= 96 { 2 } else { 1 };
        let top = (size as i32 * 72) / 100;
        // soft bar behind text
        fill_rect(
            &mut img,
            2,
            top - 2,
            size as i32 - 3,
            (top + 7 * scale + 2).min(size as i32 - 2),
            Rgb([
                bg[0].saturating_mul(2) / 3,
                bg[1].saturating_mul(2) / 3,
                bg[2].saturating_mul(2) / 3,
            ]),
        );
        let clipped: String = label.chars().take(8).collect();
        draw_text(&mut img, &clipped, cx, top, fg, scale);
    }
    img
}

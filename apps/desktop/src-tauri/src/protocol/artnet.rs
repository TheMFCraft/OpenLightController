use std::net::{SocketAddr, UdpSocket};

use crate::engine::model::CHANNELS_PER_UNIVERSE;

const ARTNET_PORT: u16 = 6454;

/// Build an ArtDmx packet for a single universe.
pub fn build_artdmx(
    sequence: u8,
    physical: u8,
    net: u8,
    subnet: u8,
    universe: u8,
    data: &[u8; CHANNELS_PER_UNIVERSE],
) -> Vec<u8> {
    let mut packet = Vec::with_capacity(18 + CHANNELS_PER_UNIVERSE);
    packet.extend_from_slice(b"Art-Net\0");
    packet.extend_from_slice(&0x5000u16.to_le_bytes()); // OpCode ArtDmx
    packet.push(0); // ProtVer Hi
    packet.push(14); // ProtVer Lo
    packet.push(sequence);
    packet.push(physical);
    let port_address = ((net as u16) << 8) | (((subnet & 0x0F) as u16) << 4) | ((universe & 0x0F) as u16);
    packet.extend_from_slice(&port_address.to_le_bytes());
    packet.extend_from_slice(&(CHANNELS_PER_UNIVERSE as u16).to_be_bytes());
    packet.extend_from_slice(data);
    packet
}

pub struct ArtNetSender {
    socket: UdpSocket,
    sequence: u8,
}

impl ArtNetSender {
    pub fn new() -> std::io::Result<Self> {
        let socket = UdpSocket::bind("0.0.0.0:0")?;
        socket.set_broadcast(true)?;
        Ok(Self {
            socket,
            sequence: 1,
        })
    }

    pub fn send(
        &mut self,
        target: &str,
        broadcast: bool,
        net: u8,
        subnet: u8,
        universe: u8,
        data: &[u8; CHANNELS_PER_UNIVERSE],
    ) -> std::io::Result<()> {
        let _ = self.socket.set_broadcast(broadcast);
        let packet = build_artdmx(self.sequence, 0, net, subnet, universe, data);
        self.sequence = if self.sequence == 255 {
            1
        } else {
            self.sequence.wrapping_add(1)
        };
        let addr: SocketAddr = format!("{target}:{ARTNET_PORT}")
            .parse()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?;
        self.socket.send_to(&packet, addr)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packet_header() {
        let data = [0u8; 512];
        let p = build_artdmx(1, 0, 0, 0, 0, &data);
        assert_eq!(&p[0..8], b"Art-Net\0");
        assert_eq!(u16::from_le_bytes([p[8], p[9]]), 0x5000);
        assert_eq!(p.len(), 18 + 512);
    }
}

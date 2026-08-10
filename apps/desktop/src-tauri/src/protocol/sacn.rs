use std::net::{Ipv4Addr, SocketAddrV4, UdpSocket};

use socket2::{Domain, Protocol, Socket, Type};

use crate::engine::model::CHANNELS_PER_UNIVERSE;

const ACN_PORT: u16 = 5568;
const VECTOR_ROOT_E131_DATA: u32 = 0x0000_0004;
const VECTOR_E131_DATA_PACKET: u32 = 0x0000_0002;
const VECTOR_DMP_SET_PROPERTY: u8 = 0x02;

fn multicast_addr(universe: u16) -> Ipv4Addr {
    // 239.255.(universe_hi).(universe_lo)
    let hi = ((universe >> 8) & 0xFF) as u8;
    let lo = (universe & 0xFF) as u8;
    Ipv4Addr::new(239, 255, hi, lo)
}

pub fn build_sacn_data(
    sequence: u8,
    priority: u8,
    universe: u16,
    cid: &[u8; 16],
    source_name: &str,
    data: &[u8; CHANNELS_PER_UNIVERSE],
) -> Vec<u8> {
    let mut packet = vec![0u8; 126 + CHANNELS_PER_UNIVERSE];

    // Root Layer
    packet[0] = 0x00;
    packet[1] = 0x10; // preamble size
    packet[2] = 0x00;
    packet[3] = 0x00; // postamble size
    packet[4..16].copy_from_slice(b"ASC-E1.17\0\0\0");
    // flags + length (root): 0x7 + (remaining after this field)
    // Root PDU length = packet len - 16
    let root_length = (packet.len() - 16) as u16;
    let root_flags_length = 0x7000 | (root_length & 0x0FFF);
    packet[16..18].copy_from_slice(&root_flags_length.to_be_bytes());
    packet[18..22].copy_from_slice(&VECTOR_ROOT_E131_DATA.to_be_bytes());
    packet[22..38].copy_from_slice(cid);

    // Framing Layer starts at 38
    let framing_length = (packet.len() - 38) as u16;
    let framing_flags_length = 0x7000 | (framing_length & 0x0FFF);
    packet[38..40].copy_from_slice(&framing_flags_length.to_be_bytes());
    packet[40..44].copy_from_slice(&VECTOR_E131_DATA_PACKET.to_be_bytes());
    let mut name_bytes = [0u8; 64];
    let name = source_name.as_bytes();
    let n = name.len().min(63);
    name_bytes[..n].copy_from_slice(&name[..n]);
    packet[44..108].copy_from_slice(&name_bytes);
    packet[108] = priority;
    packet[109] = 0; // sync universe hi
    packet[110] = 0; // sync universe lo
    packet[111] = sequence;
    packet[112] = 0; // options
    packet[113..115].copy_from_slice(&universe.to_be_bytes());

    // DMP Layer at 115
    let dmp_length = (packet.len() - 115) as u16;
    let dmp_flags_length = 0x7000 | (dmp_length & 0x0FFF);
    packet[115..117].copy_from_slice(&dmp_flags_length.to_be_bytes());
    packet[117] = VECTOR_DMP_SET_PROPERTY;
    packet[118] = 0xa1; // address type & data type
    packet[119] = 0x00;
    packet[120] = 0x00; // first property address
    packet[121] = 0x00;
    packet[122] = 0x01; // address increment
    let prop_count = (1 + CHANNELS_PER_UNIVERSE) as u16; // start code + slots
    packet[123..125].copy_from_slice(&prop_count.to_be_bytes());
    packet[125] = 0x00; // start code
    packet[126..126 + CHANNELS_PER_UNIVERSE].copy_from_slice(data);

    packet
}

pub struct SacnSender {
    socket: UdpSocket,
    sequence: u8,
    cid: [u8; 16],
    source_name: String,
}

impl SacnSender {
    pub fn new(source_name: impl Into<String>) -> std::io::Result<Self> {
        let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))?;
        socket.set_reuse_address(true)?;
        let _ = socket.set_multicast_ttl_v4(32);
        socket.bind(&SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0).into())?;
        let udp: UdpSocket = socket.into();
        let mut cid = [0u8; 16];
        let u = uuid::Uuid::new_v4();
        cid.copy_from_slice(u.as_bytes());
        Ok(Self {
            socket: udp,
            sequence: 0,
            cid,
            source_name: source_name.into(),
        })
    }

    pub fn send(
        &mut self,
        universe: u16,
        priority: u8,
        data: &[u8; CHANNELS_PER_UNIVERSE],
    ) -> std::io::Result<()> {
        let packet = build_sacn_data(
            self.sequence,
            priority,
            universe,
            &self.cid,
            &self.source_name,
            data,
        );
        self.sequence = self.sequence.wrapping_add(1);
        let dest = SocketAddrV4::new(multicast_addr(universe), ACN_PORT);
        self.socket.send_to(&packet, dest)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packet_size() {
        let data = [0u8; 512];
        let cid = [1u8; 16];
        let p = build_sacn_data(0, 100, 1, &cid, "OLC", &data);
        assert_eq!(p.len(), 126 + 512);
        assert_eq!(&p[4..13], b"ASC-E1.17");
    }
}

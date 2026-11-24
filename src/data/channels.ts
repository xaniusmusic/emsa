import type { SimProfile } from "../sim/scripts";
import type { FilterProfile } from "../audio/engine";

export type ServiceId = "police" | "fire" | "ems" | "aviation" | "naval" | "space";
export type SourceKind = "live" | "archive" | "sim";

export interface Channel {
  id: string;
  name: string;
  alias: string; // short LCD label
  zone?: string;
  freq: string; // display frequency / feed id
  mode: string;
  kind: SourceKind;
  url?: string;
  sim: SimProfile;
  location: string;
  provider: string;
  info?: string;
  custom?: boolean;
}

const bcfy = (id: number) => `https://broadcastify.cdnstream1.com/${id}`;
const latc = (mount: string) => `https://d.liveatc.net/${mount}`;
const nasa = (file: string) => `https://archive.org/download/NasaAudioHighlightReels/${file}`;

const bc = (
  feed: number,
  name: string,
  alias: string,
  location: string,
  sim: SimProfile,
  zone: string,
  mode = "P25/ANLG"
): Channel => ({
  id: `bcfy-${feed}`,
  name,
  alias,
  zone,
  freq: `FEED ${feed}`,
  mode,
  kind: "live",
  url: bcfy(feed),
  sim,
  location,
  provider: "Broadcastify",
  info: `broadcastify.com/listen/feed/${feed}`,
});

export const CHANNELS: Record<ServiceId, Channel[]> = {
  police: [
    bc(9340, "Stockton Police Dispatch", "STKN PD", "Stockton, CA", "police", "Z1 CALIF"),
    bc(4658, "Oxnard Police", "OXNARD PD", "Oxnard, CA", "police", "Z1 CALIF"),
    bc(5698, "Folsom / Citrus Hts / Elk Grove / W. Sac PD", "SAC METRO", "Sacramento Co., CA", "police", "Z1 CALIF"),
    bc(8919, "Chula Vista Police and Fire", "CHULA VST", "San Diego Co., CA", "police", "Z1 CALIF"),
    bc(10892, "Escondido Police and Fire", "ESCNDIDO", "San Diego Co., CA", "police", "Z1 CALIF"),
    bc(13249, "Sunnyvale Police and Fire", "SUNNYVALE", "Sunnyvale, CA", "police", "Z1 CALIF"),
    bc(27289, "Madison County Sheriff & Huntsville PD", "HSV PD/SO", "Huntsville, AL", "police", "Z2 NATL"),
    bc(28609, "Oak Park / River Forest / Forest Park PD-FD", "OAK PARK", "Oak Park, IL", "police", "Z2 NATL"),
    bc(16027, "Sugar Land Police, Fire & EMS", "SUGARLAND", "Sugar Land, TX", "police", "Z2 NATL"),
    bc(18140, "Rockwall City Police, Fire & EMS", "ROCKWALL", "Rockwall, TX", "police", "Z2 NATL"),
    bc(52, "Mesa County / Grand Junction PD-FD-EMS", "MESA CO", "Grand Junction, CO", "police", "Z2 NATL"),
    bc(141, "Coos & Grafton County Police and Fire", "COOS/GRFT", "N. Haverhill, NH", "police", "Z2 NATL"),
    { id: "sim-pd-1", name: "Metro PD Dispatch (Training Sim)", alias: "SIM DISP1", zone: "Z3 TRAIN", freq: "460.2250", mode: "P25 PH1", kind: "sim", sim: "police", location: "Simulated", provider: "Simulated" },
    { id: "sim-pd-2", name: "Metro PD Tac-2 (Training Sim)", alias: "SIM TAC2", zone: "Z3 TRAIN", freq: "460.4750", mode: "P25 PH1", kind: "sim", sim: "police", location: "Simulated", provider: "Simulated" },
  ],
  fire: [
    bc(909, "Chicago Fire Department – Digital", "CFD DIGTL", "Chicago, IL", "fire", "A"),
    bc(3554, "Lake County Quad 1 Fire Departments", "LAKE Q1", "Waukegan, IL", "fire", "A"),
    bc(7747, "Gurnee & Newport Twp Fire", "GURNEE FD", "Gurnee, IL", "fire", "A"),
    bc(19464, "Cypress Creek Fire", "CYPRS CRK", "Houston, TX", "fire", "A"),
    bc(19121, "Sunnyvale Fire Rescue", "SVL FIRE", "Sunnyvale, CA", "fire", "A"),
    bc(16013, "Page Fire Dispatch", "PAGE FD", "Page, AZ", "fire", "B"),
    bc(19915, "Harrison Fire", "HARRISON", "Harrison, AR", "fire", "B"),
    bc(21329, "Franklin County Fire Dispatch", "FRANKLIN", "Franklin Co., TN", "fire", "B"),
    bc(17360, "Monte Vista Fire Protection District", "MONTE VST", "Monte Vista, CO", "fire", "B"),
    bc(16880, "Utica Fire Protection District", "UTICA FPD", "Utica, IL", "fire", "B"),
    { id: "sim-fd-1", name: "County Fire Dispatch (Sim)", alias: "SIM DISP", zone: "C", freq: "154.4300", mode: "FM", kind: "sim", sim: "fire", location: "Simulated", provider: "Simulated" },
    { id: "sim-fd-2", name: "Fireground Tac 3 (Sim)", alias: "SIM FG3", zone: "C", freq: "154.2800", mode: "FM", kind: "sim", sim: "fire", location: "Simulated", provider: "Simulated" },
  ],
  ems: [
    bc(18579, "Monte Vista Ambulance", "MV AMBULN", "Monte Vista, CO", "ems", "", "FM"),
    bc(17866, "Franklin EMS", "FRANKLIN", "Franklin, TN", "ems", "", "FM"),
    bc(21979, "Midland County Volunteer EMS Dispatch", "MIDLAND", "Midland, TX", "ems", "", "FM"),
    bc(3749, "Washburn County Fire and EMS", "WASHBURN", "Shell Lake, WI", "ems", "", "FM"),
    bc(28352, "Park County Fire and EMS", "PARK CO", "Park County", "ems", "", "FM"),
    bc(9751, "Rice County Police, Fire & EMS", "RICE CO", "Faribault, MN", "ems", "", "FM"),
    bc(8755, "DeWitt County Sheriff, Fire, Cuero EMS", "DEWITT CO", "Cuero, TX", "ems", "", "FM"),
    bc(11544, "Colbert County Police, Fire & EMS", "COLBERT", "Colbert County", "ems", "", "FM"),
    bc(2897, "Powell Police, Fire, EMS", "POWELL", "Powell, WY", "ems", "", "FM"),
    { id: "sim-med-1", name: "MED-1 Hospital Patch (Sim)", alias: "MED-1", freq: "463.0000", mode: "NFM", kind: "sim", sim: "ems", location: "Simulated", provider: "Simulated", info: "UHF MED channel 1 – paramedic-to-hospital" },
    { id: "sim-med-8", name: "MED-8 EMS Dispatch (Sim)", alias: "MED-8", freq: "463.1750", mode: "NFM", kind: "sim", sim: "ems", location: "Simulated", provider: "Simulated", info: "UHF MED channel 8 – dispatch" },
  ],
  aviation: [
    { id: "kjfk", name: "KJFK Ground / Tower", alias: "JFK TWR", freq: "119.100", mode: "AM", kind: "live", url: latc("kjfk_twr"), sim: "atc", location: "New York, NY", provider: "LiveATC.net" },
    { id: "kjfk2", name: "KJFK Gnd/Twr #2", alias: "JFK GND", freq: "121.900", mode: "AM", kind: "live", url: latc("kjfk9_s"), sim: "atc", location: "New York, NY", provider: "LiveATC.net" },
    { id: "ksfo", name: "KSFO Tower", alias: "SFO TWR", freq: "120.500", mode: "AM", kind: "live", url: latc("ksfo_twr"), sim: "atc", location: "San Francisco, CA", provider: "LiveATC.net" },
    { id: "klax", name: "KLAX Tower (North/South)", alias: "LAX TWR", freq: "133.900", mode: "AM", kind: "live", url: latc("klax_twr"), sim: "atc", location: "Los Angeles, CA", provider: "LiveATC.net" },
    { id: "kord", name: "KORD Tower", alias: "ORD TWR", freq: "126.900", mode: "AM", kind: "live", url: latc("kord7"), sim: "atc", location: "Chicago, IL", provider: "LiveATC.net" },
    { id: "katl", name: "KATL Tower (Rwy 10/28)", alias: "ATL TWR", freq: "123.850", mode: "AM", kind: "live", url: latc("katl_twr_1028"), sim: "atc", location: "Atlanta, GA", provider: "LiveATC.net" },
    { id: "kbos", name: "KBOS Tower", alias: "BOS TWR", freq: "128.800", mode: "AM", kind: "live", url: latc("kbos_twr"), sim: "atc", location: "Boston, MA", provider: "LiveATC.net" },
    { id: "kdca", name: "KDCA Tower / Approach", alias: "DCA TWR", freq: "120.750", mode: "AM", kind: "live", url: latc("kdca"), sim: "atc", location: "Washington, DC", provider: "LiveATC.net" },
    { id: "klas", name: "KLAS Tower", alias: "LAS TWR", freq: "119.900", mode: "AM", kind: "live", url: latc("klas4_twr"), sim: "atc", location: "Las Vegas, NV", provider: "LiveATC.net" },
    { id: "ksea", name: "KSEA Tower #2", alias: "SEA TWR", freq: "120.950", mode: "AM", kind: "live", url: latc("ksea2_twr_e"), sim: "atc", location: "Seattle, WA", provider: "LiveATC.net" },
    { id: "ksan", name: "KSAN Tower", alias: "SAN TWR", freq: "118.300", mode: "AM", kind: "live", url: latc("ksan1_twr"), sim: "atc", location: "San Diego, CA", provider: "LiveATC.net" },
    { id: "kmia", name: "KMIA Approach", alias: "MIA APP", freq: "133.775", mode: "AM", kind: "live", url: latc("kmia3_app_133775"), sim: "atc", location: "Miami, FL", provider: "LiveATC.net" },
    { id: "kden", name: "KDEN Tower", alias: "DEN TWR", freq: "132.350", mode: "AM", kind: "live", url: latc("kden1_3"), sim: "atc", location: "Denver, CO", provider: "LiveATC.net" },
    { id: "phnl", name: "PHNL Tower", alias: "HNL TWR", freq: "118.100", mode: "AM", kind: "live", url: latc("phnl1_twr_pri"), sim: "atc", location: "Honolulu, HI", provider: "LiveATC.net" },
    { id: "cyyz", name: "CYYZ Tower", alias: "YYZ TWR", freq: "118.350", mode: "AM", kind: "live", url: latc("cyyz7"), sim: "atc", location: "Toronto, ON", provider: "LiveATC.net" },
    { id: "eham", name: "EHAM Tower", alias: "AMS TWR", freq: "118.275", mode: "AM", kind: "live", url: latc("eham01_twr_main1"), sim: "atc", location: "Amsterdam, NL", provider: "LiveATC.net" },
    { id: "rjtt", name: "RJTT Tokyo App/Dep", alias: "HND APP", freq: "126.000", mode: "AM", kind: "live", url: latc("rjtt_app_dep"), sim: "atc", location: "Tokyo, JP", provider: "LiveATC.net" },
    { id: "sim-atc", name: "Training Tower (Sim)", alias: "SIM TWR", freq: "118.000", mode: "AM", kind: "sim", sim: "atc", location: "Simulated", provider: "Simulated" },
  ],
  naval: [
    { id: "cv-marshal", name: "CATCC Marshal (Case III)", alias: "MARSHAL", freq: "285.400", mode: "UHF AM", kind: "sim", sim: "marshal", location: "CVN – Carrier Air Traffic Control Center", provider: "Simulated", info: "Holding/stack control; issues EAT, radial, angels" },
    { id: "cv-app", name: "CATCC Approach / Final (CCA)", alias: "APPROACH", freq: "342.800", mode: "UHF AM", kind: "sim", sim: "approach", location: "CVN – CATCC", provider: "Simulated", info: "Carrier Controlled Approach to 3/4 nm ball call" },
    { id: "cv-lso", name: "LSO 'Paddles' Platform", alias: "PADDLES", freq: "307.200", mode: "UHF AM", kind: "sim", sim: "lso", location: "CVN – LSO platform (port aft)", provider: "Simulated", info: "Landing Signal Officer – ball calls, bolters, wave-offs" },
    { id: "cv-tower", name: "Primary Flight Control (Tower / Boss)", alias: "PRI-FLY", freq: "355.700", mode: "UHF AM", kind: "sim", sim: "tower", location: "CVN – Island, Pri-Fly", provider: "Simulated", info: "Air Boss – Case I pattern, signal Charlie" },
    { id: "cv-strike", name: "Strike / Red Crown", alias: "STRIKE", freq: "254.300", mode: "UHF AM", kind: "sim", sim: "strike", location: "CVN – CDC / Cruiser", provider: "Simulated", info: "Mission check-in and air picture" },
    { id: "kntu", name: "NAS Oceana Gnd/Twr/App (LIVE)", alias: "OCEANA", freq: "340.200", mode: "VHF/UHF", kind: "live", url: latc("kntu"), sim: "tower", location: "NAS Oceana, VA – Master Jet Base", provider: "LiveATC.net", info: "Real feed of the Navy's east-coast strike-fighter base" },
    { id: "guard", name: "UHF Guard", alias: "GUARD", freq: "243.000", mode: "UHF AM", kind: "sim", sim: "guard", location: "Military distress / warning frequency", provider: "Simulated" },
  ],
  space: [
    { id: "iss-sg1", name: "ISS Space-to-Ground 1", alias: "S/G 1", freq: "S-BAND", mode: "S/Ku", kind: "sim", sim: "iss", location: "ISS ↔ MCC-Houston", provider: "Simulated", info: "Modeled on ISS S/G loop procedures" },
    { id: "iss-sg2", name: "ISS Space-to-Ground 2", alias: "S/G 2", freq: "S-BAND", mode: "S/Ku", kind: "sim", sim: "iss", location: "ISS ↔ MCC-Houston", provider: "Simulated" },
    { id: "skylab12", name: "Skylab I & II Air-to-Ground", alias: "SKYLAB 2", freq: "296.8 MHz", mode: "UHF A/G", kind: "archive", url: nasa("SkylabIAndIiHighlights.mp3"), sim: "iss", location: "Skylab space station (1973)", provider: "NASA JSC / Internet Archive" },
    { id: "skylab3", name: "Skylab 3 Air-to-Ground", alias: "SKYLAB 3", freq: "296.8 MHz", mode: "UHF A/G", kind: "archive", url: nasa("Skylab3Highlights.mp3"), sim: "iss", location: "Skylab space station (1973)", provider: "NASA JSC / Internet Archive" },
    { id: "skylab4", name: "Skylab 4 Air-to-Ground", alias: "SKYLAB 4", freq: "296.8 MHz", mode: "UHF A/G", kind: "archive", url: nasa("Skylab4AudioHighlights.mp3"), sim: "iss", location: "Skylab space station (1973-74)", provider: "NASA JSC / Internet Archive" },
    { id: "astp", name: "Apollo–Soyuz Test Project", alias: "ASTP", freq: "S-BAND", mode: "USB", kind: "archive", url: nasa("AstpHighlights.mp3"), sim: "iss", location: "Apollo/Soyuz docking (1975)", provider: "NASA JSC / Internet Archive" },
    { id: "a11", name: "Apollo 11 Air-to-Ground", alias: "APOLLO 11", freq: "2287.5 MHz", mode: "USB", kind: "archive", url: nasa("Apollo11Highlights.mp3"), sim: "iss", location: "Apollo 11 (1969)", provider: "NASA JSC / Internet Archive" },
    { id: "a13", name: "Apollo 13 Air-to-Ground", alias: "APOLLO 13", freq: "2287.5 MHz", mode: "USB", kind: "archive", url: nasa("Apollo13Highlights.mp3"), sim: "iss", location: "Apollo 13 (1970)", provider: "NASA JSC / Internet Archive" },
    { id: "sts1", name: "STS-1 Columbia Air-to-Ground", alias: "STS-1", freq: "S-BAND", mode: "S/UHF", kind: "archive", url: nasa("Sts-1Highlights.mp3"), sim: "iss", location: "Space Shuttle (1981)", provider: "NASA JSC / Internet Archive" },
    { id: "gemini", name: "Project Gemini Highlights", alias: "GEMINI", freq: "296.8 MHz", mode: "UHF", kind: "archive", url: nasa("ProjectGeminiHighlights.mp3"), sim: "iss", location: "Gemini (1965-66)", provider: "NASA JSC / Internet Archive" },
  ],
};

export interface ServiceMeta {
  id: ServiceId;
  tab: string;
  title: string;
  subtitle: string;
  filter: FilterProfile;
  digital: boolean;
  myId: string;
  accent: string;
}

export const SERVICES: ServiceMeta[] = [
  { id: "police", tab: "POLICE", title: "Law Enforcement Mobile", subtitle: "P25 trunked / conventional dispatch", filter: "p25", digital: true, myId: "4-Adam-12", accent: "#3b82f6" },
  { id: "fire", tab: "FIRE", title: "Fireground Portable", subtitle: "Dispatch, tone-outs & tactical channels", filter: "nfm", digital: false, myId: "Engine 51", accent: "#ef4444" },
  { id: "ems", tab: "EMS", title: "EMS Mobile / MED Channels", subtitle: "Ambulance dispatch & hospital patch", filter: "nfm", digital: false, myId: "Medic 7", accent: "#f59e0b" },
  { id: "aviation", tab: "AVIATION", title: "VHF NAV/COM Transceiver", subtitle: "Live air traffic control – 118–136.975 MHz AM", filter: "am", digital: false, myId: "November 1-2-3 Alpha Bravo", accent: "#22d3ee" },
  { id: "naval", tab: "CARRIER OPS", title: "UHF/VHF Tactical Radio Control", subtitle: "Carrier air ops: Marshal, CATCC, LSO, Pri-Fly", filter: "uhf", digital: false, myId: "Two-Zero-Three", accent: "#84cc16" },
  { id: "space", tab: "SPACE", title: "Mission Control Voice Loop Panel", subtitle: "Space-to-ground & historic air-to-ground", filter: "space", digital: false, myId: "Station", accent: "#a78bfa" },
];

// Procedurally generated radio traffic modelled on real-world procedures.

export type SimProfile =
  | "police"
  | "fire"
  | "ems"
  | "atc"
  | "marshal"
  | "approach"
  | "lso"
  | "tower"
  | "strike"
  | "guard"
  | "iss";

export interface SimLine {
  speaker: string;
  text: string;
  say?: string;
  quindar?: boolean;
}
export interface Exchange {
  pre?: "twotone" | "priority" | "emergency";
  lines: SimLine[];
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const ri = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
const chance = (p: number) => Math.random() < p;
const sp = (s: string | number) => String(s).split("").join(" ");
const nin = (s: string | number) => sp(s).replace(/9/g, "niner");
const time = () => {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return { text: `${h}:${m}`, say: `${h} ${m}` };
};

const APCO = "Adam Boy Charles David Edward Frank George Henry Ida John King Lincoln Mary Nora Ocean Paul Queen Robert Sam Tom Union Victor William X-ray Young Zebra".split(" ");
const apco = (s: string) => s.split("").map((c) => (/[A-Z]/.test(c) ? APCO[c.charCodeAt(0) - 65] : c)).join(" ");

const STREETS = ["Maple Avenue", "Oak Street", "Harbor Boulevard", "Elm Street", "Lincoln Way", "5th Street", "Washington Avenue", "Pine Ridge Road", "Industrial Parkway", "Cedar Lane", "Main Street", "River Road", "Highland Drive", "Grand Avenue", "Kingsley Court", "Mission Street"];
const CROSS = ["3rd", "Broadway", "Jefferson", "Park", "Center", "Walnut", "Laurel", "Franklin", "Clay"];
const addr = () => `${ri(1, 99) * 100 + pick([0, 10, 25, 42, 60, 88])} ${pick(STREETS)}`;
const block = () => `${ri(1, 49) * 100} block of ${pick(STREETS)}`;

// ------------------------------------------------------------------ POLICE
const beats = ["1-Adam", "2-Adam", "3-Lincoln", "1-Lincoln", "4-Mary", "2-Boy", "5-Edward", "6-Henry"];
const unit = () => `${pick(beats)}-${ri(10, 49)}`;
const unitSay = (u: string) => u.replace(/-/g, " ").replace(/(\d)(\d)$/, "$1$2");

function police(): Exchange {
  const u = unit();
  const U = unitSay(u);
  const t = time();
  const D = "Dispatch";
  const type = ri(0, 8);
  if (type === 0) {
    const call = pick([
      ["415 disturbance", "four fifteen disturbance", "neighbor reports a loud verbal argument, male and female, no weapons seen"],
      ["10-16 domestic", "ten sixteen domestic", "reporting party states her boyfriend is refusing to leave, unknown weapons"],
      ["459 burglary alarm", "four fifty-nine audible alarm", "commercial, front door zone, alarm company has no keyholder en route"],
      ["10-50 traffic collision", "ten fifty traffic collision", "two vehicles, unknown injuries, blocking the number two lane"],
      ["suspicious person", "suspicious person", "male, white t-shirt, dark jeans, looking into parked vehicles"],
      ["shoplifter in custody", "shoplifter in custody", "loss prevention is holding one adult female, cooperative"],
      ["welfare check", "welfare check", "elderly resident not answering the phone for two days"],
    ]);
    const a = block();
    const lines: SimLine[] = [
      { speaker: D, text: `${u}, ${u}.`, say: `${U}, ${U}.` },
      { speaker: u, text: `${u}, go ahead.`, say: `${U}, go ahead.` },
      { speaker: D, text: `${u}, ${call[0]}, ${a}, ${call[2]}. Code ${pick(["2", "3"])}. ${t.text}.`, say: `${U}, ${call[1]}, ${a}, ${call[2]}. Code ${pick(["two", "three"])}. ${t.say}.` },
      { speaker: u, text: `${u}, copy, en route from ${pick(CROSS)} and ${pick(STREETS)}.`, say: `${U}, copy, en route from ${pick(CROSS)} and ${pick(STREETS)}.` },
    ];
    if (chance(0.4)) lines.push({ speaker: unit(), text: `Show me covering.`, say: `${unitSay(unit())}, show me covering.` });
    return { lines };
  }
  if (type === 1) {
    const plate = `${ri(1, 9)}${String.fromCharCode(65 + ri(0, 25))}${String.fromCharCode(65 + ri(0, 25))}${String.fromCharCode(65 + ri(0, 25))}${ri(100, 999)}`;
    const car = pick(["white Honda Accord", "black Chevy Tahoe", "silver Toyota Camry", "red Ford F-150", "gray Nissan Altima", "blue Dodge Charger"]);
    const loc = `${pick(STREETS)} and ${pick(CROSS)}`;
    return {
      lines: [
        { speaker: u, text: `${u}, traffic.`, say: `${U}, traffic.` },
        { speaker: D, text: `${u}, go ahead.`, say: `${U}, go ahead.` },
        { speaker: u, text: `${loc}, plate ${plate}, ${car}, one occupant.`, say: `${loc}, plate ${apco(plate)}, ${car}, one occupant.` },
        { speaker: D, text: `${u}, copy, ${loc}, ${t.text}.`, say: `${U}, copy, ${loc}, ${t.say}.` },
        chance(0.75)
          ? { speaker: D, text: `${u}, your plate returns to a ${car}, valid registration, no wants.`, say: `${U}, your plate returns to a ${car}, valid registration, no wants.` }
          : { speaker: D, text: `${u}, be advised, plate returns expired registration, RO has a misdemeanor warrant, confirming.`, say: `${U}, be advised, plate returns expired registration, R O has a misdemeanor warrant, confirming.` },
        { speaker: u, text: `${u}, copy.`, say: `${U}, copy.` },
      ],
    };
  }
  if (type === 2) {
    const last = pick(["MARTINEZ", "JOHNSON", "NGUYEN", "OKAFOR", "BAKER", "SULLIVAN", "PATEL"]);
    const first = pick(["Carlos", "David", "Linh", "Michael", "Sarah", "Kevin", "Priya"]);
    const dob = `${ri(1, 12)}-${ri(1, 28)}-${ri(60, 99)}`;
    return {
      lines: [
        { speaker: u, text: `${u}, can you run one for 29?`, say: `${U}, can you run one for twenty-nine?` },
        { speaker: D, text: `Go ahead.` },
        { speaker: u, text: `Last name ${last}, first ${first}, DOB ${dob}.`, say: `Last name ${last}, ${apco(last)}, first ${first}, date of birth ${dob.replace(/-/g, " ")}.` },
        { speaker: D, text: `${u}, ${last} returns valid license, no wants, no warrants.`, say: `${U}, ${last} returns valid license, no wants, no warrants.` },
      ],
    };
  }
  if (type === 3) {
    return {
      pre: "priority",
      lines: [
        {
          speaker: D,
          text: `All units, BOLO, armed robbery just occurred at the ${pick(["7-Eleven", "Chevron station", "pharmacy"])}, ${addr()}. Suspect is a male, approximately 25, black hoodie, gray sweatpants, last seen northbound on foot. Use caution, suspect displayed a handgun. ${t.text}.`,
          say: `All units, be on the lookout, armed robbery just occurred at the ${pick(["7 Eleven", "Chevron station", "pharmacy"])}, ${addr()}. Suspect is a male, approximately 25, black hoodie, gray sweatpants, last seen northbound on foot. Use caution, suspect displayed a handgun. ${t.say}.`,
        },
        { speaker: unit(), text: `Copy, I'll be checking the area.`, say: `${unitSay(unit())}, copy, I'll be checking the area to the north.` },
      ],
    };
  }
  if (type === 4) {
    return {
      lines: [
        { speaker: u, text: `${u}, 10-8, clear, report to follow.`, say: `${U}, ten eight, clear, report to follow.` },
        { speaker: D, text: `${u}, copy, ${t.text}.`, say: `${U}, copy, ${t.say}.` },
      ],
    };
  }
  if (type === 5) {
    return {
      lines: [
        { speaker: u, text: `${u}, on scene.`, say: `${U}, ten ninety-seven.` },
        { speaker: D, text: `${u}, on scene, ${t.text}.`, say: `${U}, on scene, ${t.say}.` },
      ],
    };
  }
  if (type === 6) {
    return {
      pre: "priority",
      lines: [
        { speaker: u, text: `${u}, I have one running! Southbound through the alley behind ${addr()}! Male, red jacket!`, say: `${U}, I have one running! Southbound through the alley behind ${addr()}! Male, red jacket!` },
        { speaker: D, text: `All units, foot pursuit, ${u}, southbound from ${pick(STREETS)}, male in red jacket. Channel is restricted.`, say: `All units, foot pursuit, ${U}, southbound from ${pick(STREETS)}, male in red jacket. Channel is restricted to emergency traffic.` },
        { speaker: unit(), text: `En route, code 3.`, say: `${unitSay(unit())}, en route code three.` },
        { speaker: u, text: `${u}, one in custody, code 4, code 4.`, say: `${U}, one in custody, code four, code four.` },
        { speaker: D, text: `Code 4, one in custody. Channel is open. ${t.text}.`, say: `Code four, one in custody. Channel is open. ${t.say}.` },
      ],
    };
  }
  if (type === 7) {
    return {
      lines: [
        { speaker: u, text: `${u}, can you start a tow, private property impound, ${addr()}?`, say: `${U}, can you start a tow, private property impound, ${addr()}?` },
        { speaker: D, text: `${u}, copy, rotation tow is en route, ETA 20 minutes.`, say: `${U}, copy, rotation tow is en route, E T A twenty minutes.` },
      ],
    };
  }
  return {
    lines: [
      { speaker: D, text: `Any unit to clear and handle a 911 hang-up, ${addr()}, callback goes to voicemail.`, say: `Any unit to clear and handle a nine one one hang up, ${addr()}, callback goes to voicemail.` },
      { speaker: u, text: `${u}, I'll take it.`, say: `${U}, I'll take it.` },
      { speaker: D, text: `${u}, copy. ${t.text}.`, say: `${U}, copy. ${t.say}.` },
    ],
  };
}

// ------------------------------------------------------------------ FIRE
function fire(): Exchange {
  const e = `Engine ${ri(1, 32)}`;
  const tr = `Truck ${ri(1, 12)}`;
  const m = `Medic ${ri(1, 20)}`;
  const bc = `Battalion ${ri(1, 6)}`;
  const t = time();
  const D = "Fire Dispatch";
  const st = pick(STREETS);
  const a = `${ri(100, 9900)} ${st}`;
  const type = ri(0, 6);
  if (type === 0) {
    const cmd = st.split(" ")[0];
    return {
      pre: "twotone",
      lines: [
        { speaker: D, text: `${e}, ${tr}, ${m}, ${bc}, respond structure fire, ${a}, cross street ${pick(CROSS)}. Caller reports smoke showing from the second floor, possible occupant inside. Fireground Tac ${ri(2, 6)}. Time out ${t.text}.`, say: `${e}, ${tr}, ${m}, ${bc}, respond structure fire, ${a}, cross street ${pick(CROSS)}. Caller reports smoke showing from the second floor, possible occupant inside. Fire ground tac ${ri(2, 6)}. Time out ${t.say}.` },
        { speaker: e, text: `${e} responding.` },
        { speaker: tr, text: `${tr} responding.` },
        { speaker: e, text: `${e} on scene, two-story wood frame residential, heavy smoke showing from side Alpha, fire visible on the Charlie side. ${e} is establishing ${cmd} Command, we're going offensive, pulling a 1¾ to the front door. ${tr}, primary search.`, say: `${e} on scene, two story wood frame residential, heavy smoke showing from side alpha, fire visible on the charlie side. ${e} is establishing ${cmd} command, we're going offensive, pulling an inch and three quarter to the front door. ${tr}, you have primary search.` },
        { speaker: D, text: `Copy ${e}, ${cmd} Command, offensive, ${t.text}.`, say: `Copy ${e}, ${cmd} command, offensive mode, ${t.say}.` },
      ],
    };
  }
  if (type === 1) {
    return {
      lines: [
        { speaker: `${tr}`, text: `Command, ${tr}, primary search complete on floor two, all clear.` },
        { speaker: "Command", text: `Copy ${tr}, primary all clear.` },
        { speaker: `Interior`, text: `Command, Interior, we have knockdown on the main body of fire, we're opening up for overhaul.` },
        { speaker: "Command", text: `Copy, knockdown. Dispatch, Command, mark knockdown, ${t.text}.`, say: `Copy, knockdown. Dispatch, command, mark knockdown, ${t.say}.` },
      ],
    };
  }
  if (type === 2) {
    return {
      pre: "twotone",
      lines: [
        { speaker: D, text: `${e}, ${m}, respond medical, ${a}, ${ri(55, 92)}-year-old ${pick(["male", "female"])}, ${pick(["fall with head injury", "difficulty breathing", "chest pain", "unconscious, breathing", "diabetic problem"])}. Time out ${t.text}.`, say: `${e}, ${m}, respond medical, ${a}, ${ri(55, 92)} year old ${pick(["male", "female"])}, ${pick(["fall with head injury", "difficulty breathing", "chest pain", "unconscious, breathing", "diabetic problem"])}. Time out ${t.say}.` },
        { speaker: e, text: `${e} copies, responding.` },
      ],
    };
  }
  if (type === 3) {
    return {
      lines: [
        { speaker: "Command", text: `All units, Command, I need a PAR from all companies.`, say: `All units, Command, I need a P A R from all companies.` },
        { speaker: e, text: `${e} has PAR, 4 personnel.`, say: `${e} has par, four personnel.` },
        { speaker: tr, text: `${tr}, PAR, 4.`, say: `${tr}, par, four.` },
        { speaker: "Command", text: `Copy, all companies accounted for.` },
      ],
    };
  }
  if (type === 4) {
    return {
      pre: "twotone",
      lines: [
        { speaker: D, text: `${e}, respond vehicle fire, ${pick(["Interstate 5 northbound at mile marker", "Highway 101 southbound near exit"])} ${ri(10, 88)}, CHP reports a sedan fully involved on the right shoulder. ${t.text}.`, say: `${e}, respond vehicle fire, ${pick(["Interstate 5 northbound at mile marker", "Highway 101 southbound near exit"])} ${ri(10, 88)}, C H P reports a sedan fully involved on the right shoulder. ${t.say}.` },
        { speaker: e, text: `${e} responding, we'll come from the south.` },
      ],
    };
  }
  if (type === 5) {
    return {
      lines: [
        { speaker: e, text: `${e} available, back in quarters.` },
        { speaker: D, text: `${e}, in quarters, ${t.text}.`, say: `${e}, in quarters, ${t.say}.` },
      ],
    };
  }
  return {
    pre: "twotone",
    lines: [
      { speaker: D, text: `${e}, ${bc}, respond commercial fire alarm, ${a}, ${pick(["waterflow alarm", "smoke detector, 3rd floor", "pull station activation"])}. Alarm company reports no callback. ${t.text}.`, say: `${e}, ${bc}, respond commercial fire alarm, ${a}, ${pick(["water flow alarm", "smoke detector, third floor", "pull station activation"])}. Alarm company reports no callback. ${t.say}.` },
      { speaker: e, text: `${e} responding.` },
      { speaker: e, text: `${e} on scene, nothing showing, we'll be investigating.` },
    ],
  };
}

// ------------------------------------------------------------------ EMS
const HOSPS = ["County General", "St. Mary's", "Mercy Regional", "University Medical", "Children's Hospital"];
function ems(): Exchange {
  const m = `Medic ${ri(1, 24)}`;
  const t = time();
  const D = "EMS Dispatch";
  const h = pick(HOSPS);
  const type = ri(0, 4);
  if (type === 0) {
    const age = ri(19, 91);
    return {
      lines: [
        { speaker: D, text: `${m}, priority ${pick(["1", "1", "2"])}, ${addr()}, ${age}-year-old ${pick(["male", "female"])}, ${pick(["chest pain, diaphoretic", "shortness of breath, history of COPD", "stroke symptoms, onset 20 minutes ago", "seizure, now postictal", "fall from ladder, conscious and breathing", "allergic reaction, facial swelling"])}. ${t.text}.`, say: `${m}, priority ${pick(["one", "one", "two"])}, ${addr()}, ${age} year old ${pick(["male", "female"])}, ${pick(["chest pain, diaphoretic", "shortness of breath, history of C O P D", "stroke symptoms, onset twenty minutes ago", "seizure, now post ictal", "fall from ladder, conscious and breathing", "allergic reaction, facial swelling"])}. ${t.say}.` },
        { speaker: m, text: `${m}, copy, responding.` },
      ],
    };
  }
  if (type === 1) {
    const bp = `${ri(100, 180)} over ${ri(60, 100)}`;
    return {
      lines: [
        { speaker: m, text: `${h}, ${m}, on MED channel.`, say: `${h}, ${m}, on med channel.` },
        { speaker: h, text: `${m}, ${h}, go ahead.` },
        { speaker: m, text: `${h}, we are inbound priority ${ri(1, 2)} with a ${ri(30, 85)}-year-old ${pick(["male", "female"])}, chief complaint ${pick(["chest pain, 12-lead shows ST elevation in II, III and aVF", "syncope with a head lac, C-collar in place", "difficulty breathing, responding to albuterol and CPAP", "abdominal pain, nausea and vomiting"])}. Vitals: BP ${bp}, heart rate ${ri(60, 130)}, resps ${ri(14, 28)}, SpO2 ${ri(90, 99)} percent. GCS 15. IV established. ETA ${ri(4, 15)} minutes. Any questions or orders?`, say: `${h}, we are inbound priority ${ri(1, 2)} with a ${ri(30, 85)} year old ${pick(["male", "female"])}, chief complaint ${pick(["chest pain, twelve lead shows S T elevation in two, three and A V F", "syncope with a head lac, C collar in place", "difficulty breathing, responding to albuterol and C pap", "abdominal pain, nausea and vomiting"])}. Vitals: B P ${bp}, heart rate ${ri(60, 130)}, resps ${ri(14, 28)}, sat ${ri(90, 99)} percent. G C S fifteen. I V established. E T A ${ri(4, 15)} minutes. Any questions or orders?` },
        { speaker: h, text: `${m}, ${h} copies all, no orders, see you in ${pick(["trauma bay 1", "room 4", "the cath lab", "resus 2"])}.`, say: `${m}, ${h} copies all, no orders, see you in ${pick(["trauma bay one", "room four", "the cath lab", "resus two"])}.` },
      ],
    };
  }
  if (type === 2) {
    return {
      lines: [
        { speaker: m, text: `${m}, transporting one to ${h}, priority 2.`, say: `${m}, transporting one to ${h}, priority two.` },
        { speaker: D, text: `${m}, transporting, ${t.text}.`, say: `${m}, transporting, ${t.say}.` },
      ],
    };
  }
  if (type === 3) {
    return {
      pre: "priority",
      lines: [
        { speaker: m, text: `${m}, requesting a helicopter, multi-vehicle rollover with entrapment, landing zone will be the high school football field on ${pick(STREETS)}.` },
        { speaker: D, text: `${m}, copy, Air ${ri(1, 4)} is launching, ETA 14 minutes. LZ command will be on Tac ${ri(3, 8)}.`, say: `${m}, copy, Air ${ri(1, 4)} is launching, E T A fourteen minutes. L Z command will be on tac ${ri(3, 8)}.` },
      ],
    };
  }
  return {
    lines: [
      { speaker: m, text: `${m}, available at ${h}, back in service.` },
      { speaker: D, text: `${m}, copy, return to post ${ri(1, 12)}. ${t.text}.`, say: `${m}, copy, return to post ${ri(1, 12)}. ${t.say}.` },
    ],
  };
}

// ------------------------------------------------------------------ ATC
const AIRLINES = [["Delta", "DAL"], ["United", "UAL"], ["American", "AAL"], ["JetBlue", "JBU"], ["Southwest", "SWA"], ["Speedbird", "BAW"], ["Lufthansa", "DLH"], ["Alaska", "ASA"], ["Cactus", "AWE"]];
function atc(): Exchange {
  const al = pick(AIRLINES);
  const num = String(ri(12, 2899));
  const heavy = chance(0.3) ? " heavy" : "";
  const cs = `${al[0]} ${num}${heavy}`;
  const csSay = `${al[0]} ${nin(num)}${heavy}`;
  const rwy = pick(["4L", "22R", "31L", "13R", "28L", "10R", "27"]);
  const rwySay = rwy.replace("L", " left").replace("R", " right").replace(/^(\d)(\d)/, "$1 $2");
  const wind = `${String(ri(1, 36) * 10).padStart(3, "0")}`;
  const kt = ri(4, 18);
  const T = "Tower";
  const type = ri(0, 4);
  if (type === 0)
    return {
      lines: [
        { speaker: T, text: `${cs}, wind ${wind} at ${kt}, runway ${rwy}, cleared for takeoff.`, say: `${csSay}, wind ${nin(wind)} at ${kt}, runway ${rwySay}, cleared for takeoff.` },
        { speaker: cs, text: `Cleared for takeoff ${rwy}, ${cs}.`, say: `Cleared for takeoff ${rwySay}, ${csSay}.` },
      ],
    };
  if (type === 1)
    return {
      lines: [
        { speaker: cs, text: `Tower, ${cs}, ${ri(5, 9)} mile final runway ${rwy}.`, say: `Tower, ${csSay}, ${ri(5, 9)} mile final runway ${rwySay}.` },
        { speaker: T, text: `${cs}, Tower, runway ${rwy}, cleared to land, wind ${wind} at ${kt}.`, say: `${csSay}, tower, runway ${rwySay}, cleared to land, wind ${nin(wind)} at ${kt}.` },
        { speaker: cs, text: `Cleared to land ${rwy}, ${cs}.`, say: `Cleared to land ${rwySay}, ${csSay}.` },
      ],
    };
  if (type === 2)
    return {
      lines: [
        { speaker: T, text: `${cs}, runway ${rwy}, line up and wait, traffic landing the parallel.`, say: `${csSay}, runway ${rwySay}, line up and wait, traffic landing the parallel.` },
        { speaker: cs, text: `Line up and wait ${rwy}, ${cs}.`, say: `Line up and wait ${rwySay}, ${csSay}.` },
      ],
    };
  if (type === 3)
    return {
      lines: [
        { speaker: T, text: `${cs}, go around, I say again go around, aircraft on the runway. Fly runway heading, climb and maintain 3000.`, say: `${csSay}, go around, I say again go around, aircraft on the runway. Fly runway heading, climb and maintain three thousand.` },
        { speaker: cs, text: `Going around, runway heading, 3000, ${cs}.`, say: `Going around, runway heading, three thousand, ${csSay}.` },
      ],
    };
  return {
    lines: [
      { speaker: T, text: `${cs}, turn left next high-speed, contact ground point 9, good day.`, say: `${csSay}, turn left next high speed, contact ground point niner, good day.` },
      { speaker: cs, text: `Ground point 9, ${cs}, good day.`, say: `Ground point niner, ${csSay}, good day.` },
    ],
  };
}

// ------------------------------------------------------------------ CARRIER
const TYPES = ["Rhino", "Hornet", "Growler", "Lightning", "Hawkeye"];
const side = () => String(pick([1, 2, 3, 4, 5]) * 100 + ri(0, 15)).padStart(3, "0");
const sideSay = (s: string) => nin(s).replace(/0/g, "zero");
function marshal(): Exchange {
  const s = side();
  const S = sideSay(s);
  const radial = String(ri(18, 27) * 10 + 5).padStart(3, "0");
  const miles = ri(18, 32);
  const angels = ri(6, 12);
  const eat = ri(10, 50);
  const fb = String(ri(30, 60)).padStart(3, "0");
  const st = `${ri(4, 8)}.${ri(0, 9)}`;
  return {
    lines: [
      { speaker: s, text: `Marshal, ${s}, 25 miles, angels ${angels + 2}, state ${st}.`, say: `Marshal, ${S}, two five miles, angels ${angels + 2}, state ${st.replace(".", " point ")}.` },
      { speaker: "Marshal", text: `${s}, Marshal, Case 3 recovery, CV-1 approach, mother's weather 800 overcast, 2 miles. Expected final bearing ${fb}, altimeter 29.92. Marshal on the ${radial} radial, ${miles} miles, angels ${angels}. Expected approach time ${eat}, approach button 15.`, say: `${S}, Marshal, case three recovery, C V one approach, mother's weather eight hundred overcast, two miles. Expected final bearing ${sideSay(fb)}, altimeter two niner niner two. Marshal on the ${sideSay(radial)} radial, ${miles} miles, angels ${angels}. Expected approach time ${eat}, approach button one five.` },
      { speaker: s, text: `${s}, ${radial} radial, ${miles} miles, angels ${angels}, approach time ${eat}, button 15, altimeter 29.92.`, say: `${S}, ${sideSay(radial)} radial, ${miles} miles, angels ${angels}, approach time ${eat}, button one five, altimeter two niner niner two.` },
    ],
  };
}
function approach(): Exchange {
  const s = side();
  const S = sideSay(s);
  const ty = pick(TYPES.slice(0, 4));
  const st = `${ri(3, 6)}.${ri(0, 9)}`;
  return {
    lines: [
      { speaker: s, text: `${s}, platform.`, say: `${S}, platform.` },
      { speaker: "Approach", text: `${s}, Approach, radar contact 8 miles, fly bullseye.`, say: `${S}, approach, radar contact eight miles, fly bullseye.` },
      { speaker: "Final", text: `${s}, slightly above glidepath, on course, three-quarter mile, call the ball.`, say: `${S}, slightly above glide path, on course, three quarter mile, call the ball.` },
      { speaker: s, text: `${s}, ${ty} ball, ${st}.`, say: `${S}, ${ty} ball, ${st.replace(".", " point ")}.` },
      { speaker: "Paddles", text: `Roger ball.` },
    ],
  };
}
function lso(): Exchange {
  const s = side();
  const S = sideSay(s);
  const ty = pick(TYPES.slice(0, 4));
  const st = `${ri(3, 6)}.${ri(0, 9)}`;
  const outcome = ri(0, 4);
  const lines: SimLine[] = [
    { speaker: s, text: `${s}, ${ty} ball, ${st}.`, say: `${S}, ${ty} ball, ${st.replace(".", " point ")}.` },
    { speaker: "Paddles", text: `Roger ball, ${pick(["21 knots", "25 knots", "axial"])}.`, say: `Roger ball, ${pick(["two one knots", "two five knots", "axial"])}.` },
  ];
  if (outcome === 0) lines.push({ speaker: "Paddles", text: "You're high... easy with it." }, { speaker: "Paddles", text: "Bolter, bolter, bolter!" }, { speaker: "Departure", text: `${s}, climb to 1200, turn downwind.`, say: `${S}, climb to one thousand two hundred, turn downwind.` });
  else if (outcome === 1) lines.push({ speaker: "Paddles", text: "Power... a little power." }, { speaker: "Paddles", text: "Wave off, wave off, foul deck." }, { speaker: s, text: `${s}, waving off.`, say: `${S}, waving off.` });
  else if (outcome === 2) lines.push({ speaker: "Paddles", text: "Right for lineup." }, { speaker: "Paddles", text: "Easy with your nose." });
  else lines.push({ speaker: "Paddles", text: "Little power." });
  return { lines };
}
function tower(): Exchange {
  const s = side();
  const S = sideSay(s);
  const type = ri(0, 2);
  if (type === 0)
    return {
      lines: [
        { speaker: "Tower", text: "99, Tower, the deck is green, Case 1 recovery, Charlie.", say: "Ninety nine, tower, the deck is green, case one recovery, charlie." },
        { speaker: s, text: `${s}, see you at the break.`, say: `${S}, see you at the break.` },
      ],
    };
  if (type === 1)
    return {
      lines: [
        { speaker: s, text: `Tower, ${s}, flight of two, 10 miles, state ${ri(4, 7)}.${ri(0, 9)}.`, say: `Tower, ${S}, flight of two, ten miles, state ${ri(4, 7)} point ${ri(0, 9)}.` },
        { speaker: "Tower", text: `${s}, Tower, signal Charlie, 2 in the pattern, BRC ${String(ri(0, 35) * 10).padStart(3, "0")}.`, say: `${S}, tower, signal charlie, two in the pattern, B R C ${sideSay(String(ri(0, 35) * 10).padStart(3, "0"))}.` },
      ],
    };
  return {
    lines: [
      { speaker: "Boss", text: `${s}, Boss, you're cleared to break, keep it tight, ${ri(1, 3)} on the downwind.`, say: `${S}, boss, you're cleared to break, keep it tight, ${ri(1, 3)} on the downwind.` },
      { speaker: s, text: `${s}, breaking.`, say: `${S}, breaking.` },
    ],
  };
}
function strike(): Exchange {
  const flight = pick(["Showtime", "Sundown", "Ghostrider", "Bounty Hunter", "Tophatter", "Jolly Roger", "Black Knight"]);
  const n = `${ri(1, 4)}0${ri(0, 9)}`;
  return {
    lines: [
      { speaker: `${flight} ${n}`, text: `Strike, ${flight} ${n}, checking in, flight of 2, mission 3-Alpha-21, playtime 1+30.`, say: `Strike, ${flight} ${sideSay(n)}, checking in, flight of two, mission three alpha two one, playtime one plus thirty.` },
      { speaker: "Strike", text: `${flight} ${n}, Strike, radar contact, picture clean. Proceed to CAP station ${pick(["Alpha", "Bravo", "Charlie"])}, contact Red Crown on button 6.`, say: `${flight} ${sideSay(n)}, strike, radar contact, picture clean. Proceed to cap station ${pick(["alpha", "bravo", "charlie"])}, contact red crown on button six.` },
      { speaker: `${flight} ${n}`, text: `Button 6, ${flight}.`, say: `Button six, ${flight}.` },
    ],
  };
}
function guard(): Exchange {
  return chance(0.5)
    ? { lines: [{ speaker: "Red Crown", text: "All aircraft on guard, Red Crown, warning yellow, weapons tight. Red Crown out.", say: "All aircraft on guard, Red Crown, warning yellow, weapons tight. Red Crown out." }] }
    : { lines: [{ speaker: "Aircraft", text: `Unknown aircraft at ${ri(10, 25)},000 feet, ${ri(20, 60)} miles ${pick(["north", "east", "south"])} of ${pick(["the carrier", "Point Mugu"])}, you are approaching a US Navy warship, identify yourself on 121.5 or 243.0.`, say: `Unknown aircraft at ${ri(10, 25)} thousand feet, ${ri(20, 60)} miles ${pick(["north", "east", "south"])} of the carrier, you are approaching a United States Navy warship, identify yourself on one two one decimal five or two four three decimal zero.` }] };
}

// ------------------------------------------------------------------ ISS
function iss(): Exchange {
  const C = "CAPCOM";
  const crew = pick(["Station", "ISS"]);
  const type = ri(0, 5);
  const loop = pick(["1", "2"]);
  if (type === 0)
    return {
      lines: [
        { speaker: C, text: `Station, Houston on Space to Ground ${loop} for a comm check.`, say: `Station, Houston on space to ground ${loop} for a comm check.`, quindar: true },
        { speaker: crew, text: `Houston, Station, loud and clear.` },
      ],
    };
  if (type === 1)
    return {
      lines: [
        { speaker: C, text: `Station, Houston on ${loop}. We're about 2 minutes from LOS through the ZOE, next AOS in about 12 minutes on Ku-band.`, say: `Station, Houston on ${loop}. We're about two minutes from L O S through the zoe, next A O S in about twelve minutes on K u band.`, quindar: true },
        { speaker: crew, text: `Copy that Houston, see you on the other side.` },
      ],
    };
  if (type === 2)
    return {
      lines: [
        { speaker: crew, text: `Houston, Station on ${loop}, the sample swap in the Microgravity Science Glovebox is complete, ready for the closeout photos.`, say: `Houston, Station on ${loop}, the sample swap in the microgravity science glovebox is complete, ready for the closeout photos.` },
        { speaker: C, text: `Station, Houston, great work. The payload team says thanks, you can press on with step 14.`, say: `Station, Houston, great work. The payload team says thanks, you can press on with step fourteen.`, quindar: true },
      ],
    };
  if (type === 3)
    return {
      lines: [
        { speaker: C, text: `Station, Houston, we're seeing a CDRA caution on our end, no action required, ECLSS is working it.`, say: `Station, Houston, we're seeing a C D R A caution on our end, no action required, eclss is working it.`, quindar: true },
        { speaker: crew, text: `Copy, we saw the tone. Standing by.` },
      ],
    };
  if (type === 4)
    return {
      lines: [
        { speaker: crew, text: `Houston, Station, we're ready to begin the EVA prep, airlock depress is at step 6.`, say: `Houston, Station, we're ready to begin the E V A prep, airlock depress is at step six.` },
        { speaker: C, text: `Copy, you're go for depress to 5 psi, then hold for the leak check.`, say: `Copy, you're go for depress to five P S I, then hold for the leak check.`, quindar: true },
        { speaker: crew, text: `Go for 5 psi, copy.`, say: `Go for five P S I, copy.` },
      ],
    };
  return {
    lines: [
      { speaker: C, text: `Station, Houston, Flight wanted to pass along that the Dragon is on track for rendezvous tomorrow, the capture briefing will be at 14 hundred GMT.`, say: `Station, Houston, Flight wanted to pass along that the Dragon is on track for rendezvous tomorrow, the capture briefing will be at fourteen hundred G M T.`, quindar: true },
      { speaker: crew, text: `Copy that, we'll be ready. Station out.` },
    ],
  };
}

const GEN: Record<SimProfile, () => Exchange> = { police, fire, ems, atc, marshal, approach, lso, tower, strike, guard, iss };

export function generate(p: SimProfile): Exchange {
  return GEN[p]();
}

const BASE: Record<SimProfile, string> = {
  police: "Dispatch", fire: "Fire Dispatch", ems: "EMS Dispatch", atc: "Tower", marshal: "Marshal", approach: "Approach",
  lso: "Paddles", tower: "Tower", strike: "Strike", guard: "Red Crown", iss: "CAPCOM",
};

/** Reply to the user keying up on a simulated channel */
export function replyToTx(p: SimProfile, myId: string, durMs: number): Exchange {
  const b = BASE[p];
  if (durMs < 700) return { lines: [{ speaker: b, text: "Unit keying up, you're broken and unreadable, say again.", quindar: p === "iss" }] };
  const replies: Record<string, string> = {
    police: `${myId}, copy, stand by.`,
    fire: `${myId}, Fire Dispatch copies.`,
    ems: `${myId}, EMS Dispatch copies, stand by.`,
    atc: `Station calling Tower, say again your callsign.`,
    marshal: `Aircraft calling Marshal, say again, you were stepped on.`,
    approach: `Roger, continue.`,
    lso: `Paddles copies.`,
    tower: `Roger.`,
    strike: `Strike copies, stand by.`,
    guard: `Aircraft transmitting on guard, switch to a working frequency.`,
    iss: `Station, Houston, we copy, go ahead.`,
  };
  return { lines: [{ speaker: b, text: replies[p], quindar: p === "iss" }] };
}

export function replyToEmergency(p: SimProfile, myId: string): Exchange {
  const b = BASE[p];
  if (p === "police")
    return { pre: "priority", lines: [{ speaker: b, text: `Unit with the emergency, identify. ${myId}, ${myId}, your status? All units hold traffic, emergency traffic only.`, say: `Unit with the emergency, identify. ${myId}, ${myId}, what's your status? All units hold traffic, emergency traffic only.` }, { speaker: b, text: "Units responding to assist, start code 3 to last known location.", say: "Units responding to assist, start code three to last known location." }] };
  if (p === "fire")
    return { pre: "priority", lines: [{ speaker: b, text: `Emergency traffic, emergency traffic. Command, Dispatch, I have an emergency button activation from ${myId}.`, say: `Emergency traffic, emergency traffic. Command, dispatch, I have an emergency button activation from ${myId}.` }, { speaker: "Command", text: `${myId}, Command, your status? RIC team, stand by.`, say: `${myId}, command, what's your status? Rapid intervention, stand by.` }] };
  if (p === "ems") return { pre: "priority", lines: [{ speaker: b, text: `${myId}, emergency activation received, police are being sent to your location, advise when able.` }] };
  if (p === "iss") return { lines: [{ speaker: b, text: "Station, Houston, we're seeing an emergency alarm annunciation, confirm crew status, we're standing by with the emergency book.", quindar: true }] };
  return { lines: [{ speaker: b, text: `${myId}, ${b}, copy your emergency, say intentions, you are cleared priority handling, all aircraft remain clear.` }] };
}

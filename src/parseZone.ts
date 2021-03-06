import { ZONE, VRECORD, SOA, SRVRECORD, MXRECORD, CAARecord, CAATAG } from './types';

const VALUEXP = /\s+(NS|CNAME|TXT|PTR|A|AAAA|DNAME)\s+/;
const VALUETST = /(NS|CNAME|TXT|PTR|A|AAAA|IN|DNAME)/;
const PREFTST = /\s+(MX|CAA)\s+/;
let curhost: string;

/**
 * Takes BIND9 Zonefile as string, parses it and returns an object of the values within the zone
 * @param zone Valid BIND9 Zonefile as a string
 * @example
 * ```typescript
 * import { parseZoneFile } from 'ts-zone-file';
 * import { readFile } from 'fs-extra';
 * const file = await readFile('/zones/example.com');
 * const zone = await parseZoneFile(file.toString());
 * if (zone.a) zone.a.map((RR) => console.log(RR.host, RR.ttl, RR.value));
 * ```
 */
export const parseZoneFile = async (zone: string): Promise<ZONE> => {
  // Async Interface for line by line processing
  const rl = zone.split('\n');

  // @ts-ignore
  let Zone: ZONE = { $origin: '', soa: {} };
  let soa = '';
  let SOASEC;
  // Iterate through file async line by line
  for (let line of rl) {
    // Remove comments from current line
    line = line.replace(/(^|[^\\]);.*/g, '');

    // Convert current line to uppercase
    const uLine = line.toUpperCase();

    // IF upercase line has $ORIGIN then set Zone Origin to current line
    if (uLine.indexOf('$ORIGIN') === 0) Zone.$origin = line.split(/\s+/g)[1];

    // ZONE TTL
    if (uLine.indexOf('$TTL') === 0) Zone.$ttl = parseInt(line.split(/\s+/g)[1], 10);

    // If line is the first line of a SOA line enable SOA Parser
    if (/\s+SOA\s+/.test(uLine)) SOASEC = true;

    // Append data to SOA String
    if (SOASEC && /(?<=\s+)\S+/.test(line)) soa = soa + line;

    // If final line of SOA then disable SOA Mode
    if (SOASEC && /(?<=\s{10})\S+\s+\)|^\s+\)/.test(line)) SOASEC = false;

    // SRV Record
    // Test for value record and process with value extractor
    if (VALUEXP.test(uLine))
      Zone[VALUEXP.exec(line)[1].toLowerCase()]
        ? Zone[VALUEXP.exec(line)[1].toLowerCase()].push({ ...(await ProcessValueRecord(line)) })
        : (Zone[VALUEXP.exec(line)[1].toLowerCase()] = [{ ...(await ProcessValueRecord(line)) }]);
    else if (/\s+SRV\s+/.test(uLine)) Zone.srv ? Zone.srv.push(await ProcessSRV(line)) : (Zone.srv = [{ ...(await ProcessSRV(line)) }]);
    else if (/\s+(MX)\s+/.test(uLine)) Zone.mx ? Zone.mx.push(await ProcessPref(line)) : (Zone.mx = [{ ...(await ProcessPref(line)) }]);
    else if (/\s+(CAA)\s/.test(uLine)) Zone.caa ? Zone.caa.push(await ProcessCAA(line)) : (Zone.caa = [{ ...(await ProcessCAA(line)) }]);
  }
  // If their is no SOA at this point it is an INVALID Zone File
  if (soa.length === 0) throw new Error('INVALID ZONE FILE');
  // Extract the SOA Information into a line of the info
  soa = /((?<=SOA\s+\S+\s)|(\())[\s\S]*?\)/gim
    .exec(soa)[0]
    .replace(/\s+/gm, ' ')
    .replace(/\(|\)/g, '')
    .trim();
  // Extract all values with named capture groups
  Zone.soa = {
    ...(RegExp(/(?<contact>^\S+)\s{1,2}(?<serial>\d+)\s(?<refresh>\d+)\s(?<retry>\d+)\s(?<expire>\d+)\s(?<mttl>\d+)/g).exec(soa).groups as SOA),
  };

  return Zone;
};

/**
 * Extracts TTL, host, and value from a zonefile line
 * @param line line of Zonefile
 * @exmaple
 * ```typescript
 * const line = 'example.com.    300    IN    NS     ns1.exmaple.xyz.'
 * const { ttl, host, value } = await ProcessValueRecord(value)
 * ```
 */
export const ProcessValueRecord = async (line: string): Promise<VRECORD> => {
  let [host, ...rrRecord] = line.trim().split(/\s+/g);
  if (rrRecord.length < 1) throw new Error('INVALID Record');
  if (rrRecord.length == 1 && VALUETST.test(host)) host = '@';
  if (curhost && VALUETST.test(host)) host = curhost;
  else curhost = host;
  let returnObj: VRECORD = { host: host, value: '' };
  if (!isNaN(parseInt(rrRecord[0])) && rrRecord.length > 1) returnObj.ttl = parseInt(rrRecord[0]);
  returnObj.value =
    rrRecord.length > 3
      ? rrRecord
          .filter(
            (a, b) =>
              b < rrRecord.length &&
              ((!/^(NS|CNAME|TXT|PTR|A|AAAA|IN|DNAME)$/.test(a) && b > 1) || b > 2)&&
              a !== (returnObj.ttl ? returnObj.ttl.toString() : undefined),
          )
          .join(',')
          .replace(/,/g, ' ')
          .replace(/\"/g, '')
      : rrRecord[rrRecord.length - 1].replace(/\"/g, '');
  return returnObj;
};

export const ProcessSRV = async (line: string): Promise<SRVRECORD> => {
  const [hostRR, ...rr] = line.trim().split(/\s+/g);
  const [, service, protocol, host] = /^(_\w+).(_\w+).(\S+)/.exec(hostRR);
  let returnObj: SRVRECORD = {
    host,
    service,
    protocol,
    priority: parseInt(rr[rr.length - 4]),
    weight: parseInt(rr[rr.length - 3]),
    port: parseInt(rr[rr.length - 2]),
    target: rr[rr.length - 1],
  };
  if (!isNaN(parseInt(rr[0])) && rr.length > 1) returnObj.ttl = parseInt(rr[0]);
  return returnObj;
};

export const ProcessPref = async (line: string): Promise<MXRECORD> => {
  const [hostRR, ...rr] = line.trim().split(/\s+/g);
  let returnObj: MXRECORD = { host: hostRR, preference: parseInt(rr[rr.length - 2]), value: rr[rr.length - 1] };
  if (!isNaN(parseInt(rr[0])) && rr.length > 1) returnObj.ttl = parseInt(rr[0]);
  return returnObj;
};

export const ProcessCAA = async (line: string): Promise<CAARecord> => {
  const [hostRR, ...rr] = line.trim().split(/\s+/g);
  const returnOBJ: CAARecord = { host: hostRR, flags: parseInt(rr[rr.length - 3]), tag: rr[rr.length - 2] as CAATAG, value: rr[rr.length - 1].replace(/\"/g, '') };
  if (!isNaN(parseInt(rr[0])) && rr.length > 1) returnOBJ.ttl = parseInt(rr[0]);
  return returnOBJ;
};

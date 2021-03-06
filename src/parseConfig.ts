import { TSIGALGORITHM, BINDCONFIG, KEYCONFIG, ZONECONFIG, ZONETYPE, UPDATEPOLICY, CONTROLSCONFIG, AUTODNSSEC } from './types';

const reduce: { [mode: string]: 'zones' | 'keys' } = { zone: 'zones', key: 'keys' };

const MDEND = /^\}/;

const strTST = /(?<=\s+|^)(directory|pid-file|secret|key-directory|file)/;
const booleanTST = /(?<=\s+|^)(recursion|dnssec-enable|dnssec-validation|inline-signing|notify)/;
const arryCONFTST = /(also-notify|listen-on|allow-transfer|allow-recursion)\s/;

const mdTST = /(key|zone)\s\"(\S+)\"\s/;
const incTST = /include/

// Key Tests
const keyCONFTST = /(algorithm)/;

export const parseBINDConfig = async (config: string): Promise<BINDCONFIG> => {
  // Async Interface for line by line processing
  const rl = config.split('\n');

  type PARSEMODE = 'keys' | 'controls' | 'zones' | 'options';

  let mode: PARSEMODE;
  let subMode: number = undefined;
  let subOpt: string | number = undefined;
  let subObj: number;
  let configObj: BINDCONFIG = { options: {} };
  for (const line of rl) {
    // Mode setters
    // Options Block
    if (/options\s{/.test(line)) mode = 'options';

    // Controls Block
    if (/controls\s{/.test(line)) mode = 'controls';

    if (incTST.test(line)) configObj.include ? configObj.include.push(/(?<=")(.*)(?=")/.exec(line)![0]) : configObj.include = [/(?<=")(.*)(?=")/.exec(line)![0]]

    // Zone/Key Mode Detector
    if (mdTST.test(line)) {
      const { modeName, name } = /(?<modeName>key|zone)\s\"(?<name>\S+)\"\s/.exec(line).groups as { modeName: 'zone' | 'key'; name: string };
      mode = reduce[modeName];
      if (mode === 'keys' &&  !configObj[mode]) configObj[mode] = [{ name, algorithm: undefined, secret: ''}]
      else if (mode === 'keys' && configObj[mode]) configObj[mode].push({ name, algorithm: 'hmac-md5', secret: ''})
      if (mode === 'zones' && !configObj[mode]) configObj[mode] = [{ name, file: '', type: 'slave'  }]
      else if (mode == 'zones' && configObj[mode]) configObj[mode].push({ name, file: '', type: 'master'  })
      subMode = configObj[mode].length - 1;
    }

    /**
     * inet Configuration on mode controls
     * {@link http://www.zytrax.com/books/dns/ch7/controls.html}
     */
    if (/inet.*/.test(line) && mode === 'controls')
      configObj.controls = {
        inet: {
          ...(/(?<!intet\s)(?<source>\d+\.\d+\.\d\.\d|\*)\sallow\s{\s(?<allow>\w+);\s}\skeys\s{\s"(?<keys>.*)"/.exec(line).groups as {
            source: string;
            allow: string;
            keys: string;
          }),
        },
      };

    if (strTST.test(line)) {
      typeof subMode !== 'undefined' ? configObj[mode][subMode][strTST.exec(line)[1].replace(/-(\D)/, (a, b) => b.toUpperCase())] = /(?<=")(.*)(?=")/.exec(line)![0] : configObj[mode][strTST.exec(line)[1].replace(/-(\D)/, (a, b) => b.toUpperCase())] = /(?<=")(.*)(?=")/.exec(line)![0];
    }
    // Options Mode String Test
    //  if (configTST.test(line)) configObj.options[configTST.exec(line)[1].replace(/-(\D)/, (a, b) => b.toUpperCase())] = /(?<=")(.*)(?=")/.exec(line)![0];

    // Array Configuration Options
    if (arryCONFTST.test(line)) {
      const data = /(\{)[\s\S]*?(\}|$)/g
        .exec(line)[0]
        .replace(/\{|\}/g, '')
        .replace(/;|\s+/g, '')
        .trim()
        .split(/\s/g);

      if (data[0].length > 0) {
        if (mode === 'keys' || mode === 'zones')
          configObj[mode][configObj[mode].length - 1][arryCONFTST.exec(line)[1].replace(/-(\D)/, (a, b) => b.toUpperCase())] = data;
        else configObj[mode][arryCONFTST.exec(line)[1].replace(/-(\D)/, (a, b) => b.toUpperCase())] = data;
      }
      /\s+\}/.test(line) ? (subOpt = undefined) : (subOpt = arryCONFTST.exec(line)[1].replace(/-(\D)/, (a, b) => b.toUpperCase()));
      if (mode === 'keys' || mode === 'zones') subObj = configObj[mode].length - 1;
    }

    // New line array configuration option
    if (subOpt && /\s+(\w.*);/g.test(line)) {
      if (typeof subObj === 'undefined') configObj[mode][subOpt] ? configObj[mode][subOpt].push(/\s+(\w.*);/.exec(line)[1]) : (configObj[mode][subOpt] = [/\s+(\w.*);/.exec(line)[1]]);
      else 
        configObj[mode][subObj][subOpt]
          ? configObj[mode][subObj][subOpt].push(/\s+(\w.*);/.exec(line)[1])
          : (configObj[mode][subObj][subOpt] = [/\s+(\w.*);/.exec(line)[1]]);
    }

    // End of Array Configuration block
    if (subOpt && /\}/g.test(line)) subObj ? ((subObj = undefined), (subOpt = undefined)) : (subOpt = undefined);

    /**
     * Options Block Yes/No Parser
     */
    if (booleanTST.test(line)) {
      if (typeof subMode === 'undefined')
        configObj[mode][
          booleanTST
            .exec(line)[1]
            .replace(/-(\D)/, (a, b) => b.toUpperCase())
            .replace('Enable', '')
        ] = /(\w+);/g.exec(line)[1] == 'yes' ? true : false;
      else
        configObj[mode][subMode][
          booleanTST
            .exec(line)[1]
            .replace(/-(\D)/, (a, b) => b.toUpperCase())
            .replace('Enable', '')
        ] = /(\w+);/g.exec(line)[1] == 'yes' ? true : false;
    }
    /**
     * Zone Block Type parser
     */
    if (/type.*/.test(line) && mode === 'zones') configObj[mode][subMode]['type'] = /(?<=type\s).*(?=;)/.exec(line)![0] as ZONETYPE;

    // Zone Block Update Policy Parser
    if (/update-policy\s{/.test(line) && mode === 'zones')
      configObj[mode][subMode].updatePolicy = { grant: /grant\s+(\S+)\s/.exec(line)[1], zonesub: /\szonesub\s(\S+);/.exec(line)[1] };

    if (/(auto-dnssec)/.test(line) && mode === 'zones')
      configObj.zones[configObj.zones.length - 1].autoDNSSEC = /(?<=auto-dnssec\s)(\w+)/.exec(line)[1] as AUTODNSSEC;

    if (mode === 'keys' && /algorithm.*/.test(line)) configObj.keys[configObj.keys.length - 1].algorithm = /(?<=algorithm\s).*(?=;)/.exec(line)![0] as TSIGALGORITHM;

    if (MDEND.test(line)) mode = undefined;
  }
  return configObj;
};

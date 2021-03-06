import { BINDCONFIG } from './types';

export const generateConfig = async (config: BINDCONFIG): Promise<string> => {
  const configString = `${config.include ? `${config.include.map(str => `include "${str}";\n`).join('')}` : ''}
${config.controls ? `controls {\n\tinet ${config.controls.inet.source} allow { ${config.controls.inet.allow}; } keys { "${config.controls.inet.keys}"; };\n};` : ''}
options {
${config.options.directory ? `\tdirectory "${config.options.directory}";\n` : ``}${config.options.pidFile ? `\tpid-file "${config.options.pidFile}";\n` : ``}${
    config.options.listenOn ? `\tlisten-on {\n${config.options.listenOn.map(on => `\t\t${on};\n`).join('')}\t};\n` : ``
  }${config.options.allowTransfer ? `\tallow-transfer {\n${config.options.allowTransfer.map(transfer => `\t\t${transfer};\n`).join('')}\t};\n` : ``}${
    config.options.alsoNotify ? `\talso-notify {\n${config.options.alsoNotify.map(notify => `\t\t${notify};\n`).join('')}\t};\n` : ``
  }${config.options.allowRecursion ? `\tallow-recursion {\n${config.options.allowRecursion.map(recursion => `\t\t${recursion};\n`).join('')}\t};\n` : ``}${
    typeof config.options.recursion !== 'undefined' ? `\trecursion ${config.options.recursion ? `yes` : `no`};\n` : ''
  }${typeof config.options.dnssec !== 'undefined' ? `\tdnssec-enable ${config.options.dnssec ? `yes` : `no`};\n` : ''}${
    typeof config.options.dnssecValidation !== 'undefined' ? `\tdnssec-validation ${config.options.dnssecValidation ? `yes` : `no`};\n` : ''
  }};

${config.keys ? config.keys.map(key => `key "${key.name}" {\n\talgorithm ${key.algorithm};\n\tsecret "${key.secret}";\n};\n\n`).join('') : ''}
${config.zones
    .map(
      zone =>
        `zone "${zone.name}" {\n\ttype ${zone.type};\n\tfile "${zone.file}";\n${zone.keyDirectory ? `\tkey-directory "${zone.keyDirectory}";\n` : ''}${
          zone.autoDNSSEC ? `\tauto-dnssec ${zone.autoDNSSEC};\n` : ''
        }${typeof zone.notify !== 'undefined' ? `\tnotify ${zone.notify ? `yes` : `no`};\n` : ``}${
          typeof zone.inlineSigning !== 'undefined' ? `\tinline-signing ${zone.inlineSigning ? `yes` : `no`};\n` : ``
        }${zone.updatePolicy ? `\tupdate-policy { grant ${zone.updatePolicy.grant} zonesub ${zone.updatePolicy.zonesub}; };\n` : ``}${
          zone.allowTransfer ? `\tallow-transfer {\n${zone.allowTransfer.map(transfer => `\t\t${transfer};\n`).join('')}\t};\n` : ``
        }${zone.alsoNotify ? `\talso-notify {\n${zone.alsoNotify.map(notify => `\t\t${notify};\n`).join('')}\n\t};\n` : ``}};\n\n`,
    )
    .join('')}`;

  return configString;
};
